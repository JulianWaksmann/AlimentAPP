import json
import logging
import os
import ssl
from datetime import datetime
from decimal import Decimal, InvalidOperation
from io import BytesIO
from typing import Any, Dict, Iterable, List, Optional

import boto3
import pg8000
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.pdfgen import canvas
    from reportlab.platypus import Paragraph
except ImportError as exc:  # pragma: no cover
    raise RuntimeError(
        "La librería reportlab es necesaria para generar el PDF. "
        "Súbela como layer a la Lambda antes de ejecutar."
    ) from exc

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
ses_client = boto3.client("ses")

DB_CONFIG: Optional[Dict[str, Any]] = None
SSL_CONTEXT = ssl.create_default_context()

COMPANY_NAME = 'core-app'
COMPANY_ADDRESS = 'av. libertador 1234'
COMPANY_EMAIL = 'Coreappg4@gmail.com'
COMPANY_PHONE = '+54 011 66358741'
SES_SOURCE_EMAIL = 'Coreappg4@gmail.com'
COMPANY_TAGLINE = os.getenv("INVOICE_COMPANY_TAGLINE", "")


class ValidationError(Exception):
    """Errores funcionales durante la generación y envío de facturas."""
    # Se utiliza para propagar fallos de negocio hacia el handler.


def get_db_parameters() -> Dict[str, Any]:
    """Obtiene credenciales de RDS desde SSM, cacheadas en memoria."""
    # Recupera parámetros secretos para reutilizarlos.
    global DB_CONFIG
    if DB_CONFIG:
        return DB_CONFIG

    names = [
        "/alimentapp/db/host",
        "/alimentapp/db/password",
        "/alimentapp/db/port",
        "/alimentapp/db/username",
    ]
    resp = ssm_client.get_parameters(Names=names, WithDecryption=True)
    if len(resp["Parameters"]) != len(names):
        missing = set(names) - {p["Name"] for p in resp["Parameters"]}
        raise RuntimeError(f"Faltan parámetros en SSM: {', '.join(sorted(missing))}")
    data = {p["Name"].split("/")[-1]: p["Value"] for p in resp["Parameters"]}
    DB_CONFIG = {
        "host": data["host"],
        "port": int(data.get("port", "5432")),
        "user": data["username"],
        "password": data["password"],
        "database": os.getenv("DB_NAME", "postgres"),
    }
    return DB_CONFIG


def get_connection():
    """Abre una conexión pg8000 con SSL hacia la base de datos."""
    # Construye la conexión utilizando los parámetros cacheados.
    cfg = get_db_parameters()
    return pg8000.connect(
        host=cfg["host"],
        port=cfg["port"],
        database=cfg["database"],
        user=cfg["user"],
        password=cfg["password"],
        ssl_context=SSL_CONTEXT,
        timeout=10,
    )


def fetch_all(cur, sql: str, params: Iterable[Any] = None) -> List[Dict[str, Any]]:
    """Ejecuta un SELECT y devuelve las filas como diccionarios."""
    # Ayuda a mapear las filas de la consulta en estructuras clave-valor.
    cur.execute(sql, tuple(params or ()))
    rows = cur.fetchall()
    columns = [c[0] for c in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def decimal_value(value: Any, contexto: str) -> Decimal:
    """Convierte valores a Decimal y explica los errores de formato."""
    # Garantiza cálculos monetarios consistentes en toda la lambda.
    if value is None:
        raise ValidationError(f"{contexto} ausente.")
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError(f"{contexto} inválido: {value}")


def obtener_orden(cur, orden_id: int) -> Dict[str, Any]:
    """Recupera cabecera de orden de venta y datos del cliente."""
    # Consulta orden_venta + cliente para armar datos de factura.
    sql = f"""
        SELECT
            ov.id,
            ov.fecha_pedido,
            ov.fecha_entrega_solicitada,
            ov.estado,
            ov.valor_total_pedido,
            ov.observaciones,
            c.razon_social,
            c.email,
            c.cuil,
            c.nombre_contacto,
            c.apellido_contacto,
            c.telefono
        FROM {ENV}.orden_venta ov
        JOIN {ENV}.cliente c ON c.id = ov.id_cliente
        WHERE ov.id = %s
    """
    rows = fetch_all(cur, sql, (orden_id,))
    if not rows:
        raise ValidationError(f"No existe la orden de venta {orden_id}.")
    orden = rows[0]
    logger.info("Cabecera de orden recuperada: %s", orden)
    return orden


def obtener_items(cur, orden_id: int) -> List[Dict[str, Any]]:
    """Obtiene las líneas de la orden (orden_produccion + producto)."""
    # Lista los productos, cantidades y precios unitarios asociados.
    sql = f"""
        SELECT
            op.id,
            op.cantidad,
            op.estado,
            p.nombre AS producto,
            p.descripcion,
            p.precio_venta
        FROM {ENV}.orden_produccion op
        JOIN {ENV}.producto p ON p.id = op.id_producto
        WHERE op.id_orden_venta = %s
        ORDER BY p.nombre
    """
    items = fetch_all(cur, sql, (orden_id,))
    if not items:
        raise ValidationError(f"La orden {orden_id} no posee productos asociados.")
    logger.info("Se obtuvieron %s ítems de la orden %s.", len(items), orden_id)
    return items


def formatear_moneda(valor: Decimal) -> str:
    """Formatea un Decimal como importe monetario con dos decimales."""
    # Normaliza la forma en que se muestran los importes en PDF/mail.
    return f"${valor:,.2f}"


def generar_pdf_factura(orden: Dict[str, Any], items: List[Dict[str, Any]]) -> bytes:
    """Genera el PDF de la factura en memoria usando ReportLab."""
    # Construye un layout con logos, encabezado y tabla de productos.
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=LETTER)
    width, height = LETTER
    margin = 50

    fecha_pedido = orden["fecha_pedido"]
    fecha_pedido_dt = fecha_pedido if isinstance(fecha_pedido, datetime) else None
    fecha_entrega = orden.get("fecha_entrega_solicitada")
    fecha_entrega_dt = fecha_entrega if isinstance(fecha_entrega, datetime) else None

    def dibujar_gradiente(canvas_obj, x_pos, y_pos, ancho, alto, color_inicio, color_fin, pasos=80):
        inicio = colors.HexColor(color_inicio)
        fin = colors.HexColor(color_fin)
        for i in range(pasos):
            ratio = i / (pasos - 1)
            r = inicio.red + (fin.red - inicio.red) * ratio
            g = inicio.green + (fin.green - inicio.green) * ratio
            b = inicio.blue + (fin.blue - inicio.blue) * ratio
            canvas_obj.setFillColor(colors.Color(r, g, b))
            x_actual = x_pos + (ancho * i) / pasos
            canvas_obj.rect(x_actual, y_pos, (ancho / pasos) + 1, alto, fill=True, stroke=False)

    header_top = height - (margin / 2)
    accent_base = header_top - 58

    pdf.setFillColor(colors.HexColor("#AD00FF"))
    pdf.rect(0, accent_base + 6, width, 1.5, fill=True, stroke=False)
    dibujar_gradiente(pdf, 0, accent_base, width, 6, "#4C00FF", "#AD00FF", pasos=80)
    pdf.setFillColor(colors.HexColor("#4C00FF"))
    pdf.rect(0, accent_base - 2, width, 1, fill=True, stroke=False)

    title_y = header_top - 22
    pdf.setFillColor(colors.HexColor("#32127A"))
    pdf.setFont("Helvetica-Bold", 32)
    pdf.drawCentredString(width / 2, title_y, COMPANY_NAME.upper())

    if COMPANY_TAGLINE:
        pdf.setFont("Helvetica", 13)
        pdf.drawCentredString(width / 2, title_y - 20, COMPANY_TAGLINE)

    # Tarjeta con información de la empresa
    card_width = width - 2 * margin
    company_card_height = 68
    company_card_top = accent_base - 18
    company_card_bottom = company_card_top - company_card_height

    pdf.setFillColor(colors.white)
    pdf.roundRect(margin, company_card_bottom, card_width, company_card_height, 10, fill=True, stroke=False)
    pdf.setStrokeColor(colors.HexColor("#E5DAFF"))
    pdf.setLineWidth(1)
    pdf.roundRect(margin, company_card_bottom, card_width, company_card_height, 10, fill=False, stroke=True)

    pdf.setFillColor(colors.HexColor("#4C00FF"))
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(margin + 18, company_card_top - 20, "Información de la empresa")

    pdf.setFont("Helvetica", 9)
    pdf.setFillColor(colors.black)
    company_lines = [
        ("Dirección", COMPANY_ADDRESS),
        ("Email", COMPANY_EMAIL),
        ("Teléfono", COMPANY_PHONE),
    ]
    line_y = company_card_top - 34
    for etiqueta, valor in company_lines:
        pdf.drawString(margin + 18, line_y, f"{etiqueta}: {valor}")
        line_y -= 13

    # Tarjeta con datos clave
    card_top = company_card_bottom - 24
    card_height = 148
    card_bottom = card_top - card_height

    pdf.setFillColor(colors.white)
    pdf.roundRect(margin, card_bottom, card_width, card_height, 12, fill=True, stroke=False)
    pdf.setStrokeColor(colors.HexColor("#DFCCFF"))
    pdf.setLineWidth(1)
    pdf.roundRect(margin, card_bottom, card_width, card_height, 12, fill=False, stroke=True)

    pdf.setFillColor(colors.HexColor("#AD00FF"))
    pdf.roundRect(margin, card_top - 6, card_width, 6, 12, fill=True, stroke=False)

    pdf.setStrokeColor(colors.HexColor("#E5DAFF"))
    divider_x = margin + card_width / 2
    pdf.line(divider_x, card_bottom + 14, divider_x, card_top - 14)

    pdf.setFillColor(colors.HexColor("#4C00FF"))
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(margin + 20, card_top - 25, "Datos del cliente")
    pdf.drawString(divider_x + 20, card_top - 25, "Detalle de factura")

    pdf.setFillColor(colors.black)
    pdf.setFont("Helvetica", 10)

    detalles_cliente = [
        f"Razón Social: {orden['razon_social']}",
        f"CUIL/CUIT: {orden.get('cuil', 'N/D')}",
    ]
    contacto = f"{orden.get('nombre_contacto') or ''} {orden.get('apellido_contacto') or ''}".strip()
    if contacto:
        detalles_cliente.append(f"Contacto: {contacto}")
    if orden.get("telefono"):
        detalles_cliente.append(f"Teléfono: {orden['telefono']}")
    detalles_cliente.append(f"Email: {orden['email']}")

    left_y = card_top - 43
    for linea in detalles_cliente:
        pdf.drawString(margin + 20, left_y, linea)
        left_y -= 14

    try:
        total_pedido_decimal = decimal_value(orden.get("valor_total_pedido"), "valor total pedido")
    except ValidationError:
        total_pedido_decimal = Decimal("0")
        for item in items:
            cant_tmp = decimal_value(item["cantidad"], "cantidad de producto")
            precio_tmp = decimal_value(item["precio_venta"], "precio_unitario")
            total_pedido_decimal += cant_tmp * precio_tmp

    datos_orden = [
        f"N° de factura: {orden['id']}",
        f"Fecha pedido: {fecha_pedido_dt.strftime('%d/%m/%Y') if fecha_pedido_dt else 'N/D'}",
        f"Entrega solicitada: {fecha_entrega_dt.strftime('%d/%m/%Y') if fecha_entrega_dt else 'N/D'}",
        f"Total pedido: {formatear_moneda(total_pedido_decimal)}",
    ]
    right_y = card_top - 43
    for linea in datos_orden:
        pdf.drawString(divider_x + 20, right_y, linea)
        right_y -= 14

    content_bottom = min(left_y, right_y)
    y_cursor = content_bottom - 24

    observaciones_texto = (orden.get("observaciones") or "").strip()
    if observaciones_texto:
        estilo_obs = ParagraphStyle("obs", fontName="Helvetica", fontSize=9, leading=12)
        parrafo = Paragraph(observaciones_texto, estilo_obs)
        texto_max_ancho = card_width - 36
        _, parrafo_alto = parrafo.wrap(texto_max_ancho, 140)
        obs_card_altura = parrafo_alto + 32
        obs_card_top = content_bottom - 12
        obs_card_bottom = obs_card_top - obs_card_altura

        pdf.setFillColor(colors.HexColor("#F6F0FF"))
        pdf.roundRect(margin, obs_card_bottom, card_width, obs_card_altura, 10, fill=True, stroke=False)
        pdf.setStrokeColor(colors.HexColor("#E5DAFF"))
        pdf.roundRect(margin, obs_card_bottom, card_width, obs_card_altura, 10, fill=False, stroke=True)

        pdf.setFillColor(colors.HexColor("#4C00FF"))
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(margin + 18, obs_card_top - 16, "Observaciones")

        pdf.setFillColor(colors.black)
        pdf.setFont("Helvetica", 9)
        parrafo.drawOn(pdf, margin + 18, obs_card_top - 24 - parrafo_alto)

        y_cursor = obs_card_bottom - 24

    y_inicio_tabla = y_cursor

    # Tabla de productos
    columnas = [
        ("OP ID", "left"),
        ("Producto", "left"),
        ("Cantidad", "right"),
        ("Precio unit.", "right"),
        ("Subtotal", "right"),
    ]
    tabla_ancho = width - 2 * margin
    col_ratios = [0.12, 0.43, 0.15, 0.15, 0.15]
    col_widths = []
    acumulado = 0.0
    for idx, ratio in enumerate(col_ratios):
        if idx == len(col_ratios) - 1:
            col_widths.append(tabla_ancho - acumulado)
        else:
            ancho = round(tabla_ancho * ratio, 2)
            col_widths.append(ancho)
            acumulado += ancho
    encabezados = [col[0] for col in columnas]
    alineaciones = [col[1] for col in columnas]
    tabla_x = margin
    padding_left = 8
    padding_right = 8

    def dibujar_encabezado_tabla(y_pos: float) -> float:
        header_height = 20
        font_size = 10
        box_top = y_pos
        box_bottom = box_top - header_height
        # --- INICIO CORRECCIÓN (Alineación vertical) ---
        # Centra verticalmente el texto en la celda
        text_y = box_bottom + (header_height - font_size) / 2 + 1.5
        # --- FIN CORRECCIÓN ---

        pdf.setFont("Helvetica-Bold", font_size)
        pdf.setFillColor(colors.HexColor("#E9E1FF"))
        pdf.rect(tabla_x, box_bottom, tabla_ancho, header_height, fill=True, stroke=False)
        pdf.setFillColor(colors.black)
        
        x_cursor = tabla_x
        for titulo, alineacion, ancho_columna in zip(encabezados, alineaciones, col_widths):
            if alineacion == "right":
                # --- CORRECCIÓN: usa la nueva text_y ---
                pdf.drawRightString(x_cursor + ancho_columna - padding_right, text_y, titulo)
            else:
                # --- CORRECCIÓN: usa la nueva text_y ---
                pdf.drawString(x_cursor + padding_left, text_y, titulo)
            x_cursor += ancho_columna
            
        pdf.setStrokeColor(colors.HexColor("#D7C2FF"))
        pdf.line(tabla_x, box_bottom, tabla_x + tabla_ancho, box_bottom)
        pdf.setFont("Helvetica", 9)
        return box_bottom - 6

    y = dibujar_encabezado_tabla(y_inicio_tabla)

    total_factura = Decimal("0")
    pdf.setFillColor(colors.black)
    row_height = 18
    font_size = 9
    
    for idx, item in enumerate(items):
        if y < margin + 90:
            pdf.showPage()
            y = height - margin
            y = dibujar_encabezado_tabla(y)
            pdf.setFillColor(colors.black)
            pdf.setFont("Helvetica", font_size) # Restablecer fuente después de dibujar encabezado
            
        cantidad = decimal_value(item["cantidad"], "cantidad de producto")
        precio = decimal_value(item["precio_venta"], "precio_unitario")
        subtotal = cantidad * precio
        total_factura += subtotal

        op_id = item.get("id")
        op_label = f"OP-{int(op_id):06d}" if op_id is not None else "N/D"
        nombre_producto = (item.get("producto") or "").strip()
        valores = [
            op_label,
            nombre_producto[:42],
            f"{cantidad}",
            formatear_moneda(precio),
            formatear_moneda(subtotal),
        ]

        top = y
        bottom = y - row_height
        
        # --- INICIO CORRECCIÓN (Alineación vertical) ---
        # Centra verticalmente el texto en la celda
        text_y = bottom + (row_height - font_size) / 2 + 1.5
        # --- FIN CORRECCIÓN ---

        if idx % 2 == 0:
            pdf.setFillColor(colors.HexColor("#F8F3FF"))
            pdf.rect(tabla_x, bottom, tabla_ancho, row_height, fill=True, stroke=False)
            pdf.setFillColor(colors.black)

        # Esta es la lógica horizontal. Estaba correcta en tu código.
        x_cursor = tabla_x
        for valor, alineacion, ancho_columna in zip(valores, alineaciones, col_widths):
            if alineacion == "right":
                # --- CORRECCIÓN: usa la nueva text_y ---
                pdf.drawRightString(x_cursor + ancho_columna - padding_right, text_y, valor)
            else:
                # --- CORRECCIÓN: usa la nueva text_y ---
                pdf.drawString(x_cursor + padding_left, text_y, valor)
            x_cursor += ancho_columna

        pdf.setStrokeColor(colors.HexColor("#ECE0FF"))
        pdf.line(tabla_x, bottom, tabla_x + tabla_ancho, bottom)

        y = bottom

    # Totales
    total_box_height = 24
    total_box_bottom = y - total_box_height
    pdf.setFillColor(colors.HexColor("#ECE0FF"))
    pdf.rect(tabla_x, total_box_bottom, tabla_ancho, total_box_height, fill=True, stroke=False)
    pdf.setFillColor(colors.black)

    # --- INICIO CORRECCIÓN (Alineación vertical) ---
    # Centra verticalmente el texto en la celda
    font_size_label = 9
    font_size_total = 11
    text_y_label = total_box_bottom + (total_box_height - font_size_label) / 2 + 1.5
    text_y_total = total_box_bottom + (total_box_height - font_size_total) / 2 + 2
    # --- FIN CORRECCIÓN ---

    pdf.setFont("Helvetica", font_size_label)
    # --- CORRECCIÓN: usa la nueva text_y_label ---
    pdf.drawString(tabla_x + padding_left, text_y_label, "Importe total")
    
    pdf.setFont("Helvetica-Bold", font_size_total)
    # --- CORRECCIÓN: usa la nueva text_y_total ---
    pdf.drawRightString(tabla_x + tabla_ancho - padding_right, text_y_total, formatear_moneda(total_factura))
    y -= (total_box_height + 12) # y -= 36

    pdf.setFont("Helvetica", 9)
    pdf.setFillColor(colors.HexColor("#636e72"))
    pdf.drawCentredString(width / 2, 40, f"Gracias por confiar en nosotros. Ante cualquier consulta, escribinos a {COMPANY_EMAIL}")

    pdf.showPage()
    pdf.save()

    buffer.seek(0)
    logger.info("PDF generado correctamente (%s bytes).", len(buffer.getvalue()))
    return buffer.getvalue()


def enviar_factura_por_email(destinatario: str, orden: Dict[str, Any], pdf_bytes: bytes) -> None:
    """Envía la factura por correo usando Amazon SES."""
    # Construye un correo con adjunto PDF y lo envía vía SES.
    if not destinatario:
        raise ValidationError("La orden no posee email de cliente para enviar la factura.")

    asunto = f"Factura OV-{orden['id']:06d} - {COMPANY_NAME}"
    cuerpo = (
        f"Estimado/a {orden['razon_social']},\n\n"
        f"Adjuntamos la factura correspondiente a su orden de venta OV-{orden['id']:06d}.\n"
        "Ante cualquier consulta, quedamos a disposición.\n\n"
        f"Saludos cordiales,\n{COMPANY_NAME}"
    )

    mensaje = MIMEMultipart()
    mensaje["Subject"] = asunto
    mensaje["From"] = SES_SOURCE_EMAIL
    mensaje["To"] = destinatario

    mensaje.attach(MIMEText(cuerpo, "plain", "utf-8"))

    adjunto = MIMEApplication(pdf_bytes, _subtype="pdf")
    nombre_archivo = f"Factura_OV_{orden['id']:06d}.pdf"
    adjunto.add_header("Content-Disposition", "attachment", filename=nombre_archivo)
    mensaje.attach(adjunto)

    ses_client.send_raw_email(
        Source=SES_SOURCE_EMAIL,
        Destinations=[destinatario],
        RawMessage={"Data": mensaje.as_string()},
    )
    logger.info("Factura enviada a %s con asunto '%s'.", destinatario, asunto)


def lambda_handler(event, context):
    """Punto de entrada de la Lambda: genera y envía la factura PDF."""
    # Orquesta lectura del request, armado del PDF y envío por email.
    logger.info("Evento recibido: %s", event)

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    body = event.get("body")
    payload = None
    if isinstance(body, str):
        payload = json.loads(body)
    elif isinstance(body, dict):
        payload = body

    if payload is None and isinstance(event, dict):
        payload = event

    if not payload or "orden_venta_id" not in payload:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "Debe especificar el campo orden_venta_id"}),
        }

    try:
        orden_id = int(payload["orden_venta_id"])
    except (TypeError, ValueError):
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "orden_venta_id debe ser un entero válido"}),
        }

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        orden = obtener_orden(cur, orden_id)
        items = obtener_items(cur, orden_id)
        pdf_bytes = generar_pdf_factura(orden, items)
        enviar_factura_por_email(orden["email"], orden, pdf_bytes)

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"message": f"Factura enviada a {orden['email']}", "orden_venta_id": orden_id}),
        }
    except ValidationError as exc:
        logger.warning("Validación fallida: %s", exc)
        return {
            "statusCode": 400,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": str(exc)}),
        }
    except Exception as exc:
        logger.exception("Error inesperado generando la factura OV-%s", orden_id)
        return {
            "statusCode": 500,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": "Error interno", "detail": str(exc)}),
        }
    finally:
        if conn:
            conn.close()
