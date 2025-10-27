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

COMPANY_NAME = os.getenv("INVOICE_COMPANY_NAME", "AlimentAPP")
COMPANY_ADDRESS = os.getenv("INVOICE_COMPANY_ADDRESS", "Dirección Comercial - Ciudad, País")
COMPANY_EMAIL = os.getenv("INVOICE_COMPANY_EMAIL", "facturacion@alimentapp.com")
COMPANY_PHONE = os.getenv("INVOICE_COMPANY_PHONE", "+54 11 5555-0000")
SES_SOURCE_EMAIL = os.getenv("SES_SOURCE_EMAIL", COMPANY_EMAIL)


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

    # Encabezado corporativo
    pdf.setFillColor(colors.HexColor("#0a3d62"))
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(margin, height - 70, COMPANY_NAME)
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(colors.black)
    pdf.drawString(margin, height - 85, COMPANY_ADDRESS)
    pdf.drawString(margin, height - 97, f"Email: {COMPANY_EMAIL}  |  Tel: {COMPANY_PHONE}")

    # Datos del cliente
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(margin, height - 130, "Factura para:")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(margin, height - 145, f"Razón Social: {orden['razon_social']}")
    pdf.drawString(margin, height - 157, f"CUIL/CUIT: {orden.get('cuil', 'N/D')}")
    contacto = f"{orden.get('nombre_contacto') or ''} {orden.get('apellido_contacto') or ''}".strip()
    if contacto:
        pdf.drawString(margin, height - 169, f"Contacto: {contacto}")
    if orden.get("telefono"):
        pdf.drawString(margin, height - 181, f"Teléfono: {orden['telefono']}")
    pdf.drawString(margin, height - 193, f"Email: {orden['email']}")

    # Datos de la orden
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(width - 260, height - 130, f"Factura N° OV-{orden['id']:06d}")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(width - 260, height - 145, f"Fecha pedido: {fecha_pedido_dt.strftime('%d/%m/%Y') if fecha_pedido_dt else 'N/D'}")
    pdf.drawString(width - 260, height - 157, f"Entrega solicitada: {fecha_entrega_dt.strftime('%d/%m/%Y') if fecha_entrega_dt else 'N/D'}")
    pdf.drawString(width - 260, height - 169, f"Estado actual: {orden['estado']}")

    if orden.get("observaciones"):
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(margin, height - 220, "Observaciones:")
        pdf.setFont("Helvetica", 9)
        estilo_obs = ParagraphStyle("obs", fontName="Helvetica", fontSize=9, leading=11)
        parrafo = Paragraph(orden["observaciones"], estilo_obs)
        parrafo.wrapOn(pdf, width - 2 * margin, 60)
        parrafo.drawOn(pdf, margin, height - 250)
        y_inicio_tabla = height - 270
    else:
        y_inicio_tabla = height - 220

    # Tabla de productos
    columnas = ["Producto", "Descripción", "Cantidad", "Precio unitario", "Subtotal"]
    col_widths = [120, 180, 70, 90, 90]
    pdf.setFont("Helvetica-Bold", 10)
    y = y_inicio_tabla
    pdf.setFillColor(colors.HexColor("#f1f2f6"))
    pdf.rect(margin, y - 16, sum(col_widths), 18, fill=True, stroke=False)
    pdf.setFillColor(colors.black)
    x = margin + 5
    for idx, col in enumerate(columnas):
        pdf.drawString(x, y - 12, col)
        x += col_widths[idx]
    y -= 24
    pdf.setFont("Helvetica", 9)

    total_factura = Decimal("0")
    for item in items:
        if y < 100:
            pdf.showPage()
            y = height - margin
            pdf.setFont("Helvetica", 9)
        descripcion = item.get("descripcion") or ""
        cantidad = decimal_value(item["cantidad"], "cantidad de producto")
        precio = decimal_value(item["precio_venta"], "precio_unitario")
        subtotal = cantidad * precio
        total_factura += subtotal

        pdf.drawString(margin + 5, y, item["producto"])
        pdf.drawString(margin + 5 + col_widths[0], y, descripcion[:60])
        pdf.drawRightString(margin + col_widths[0] + col_widths[1] + 50, y, f"{cantidad}")
        pdf.drawRightString(margin + col_widths[0] + col_widths[1] + col_widths[2] + 85, y, formatear_moneda(precio))
        pdf.drawRightString(margin + sum(col_widths) - 5, y, formatear_moneda(subtotal))
        y -= 16

    # Totales
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawRightString(margin + sum(col_widths) - 5, y - 10, f"Total: {formatear_moneda(total_factura)}")

    pdf.setFont("Helvetica", 9)
    pdf.setFillColor(colors.HexColor("#636e72"))
    pdf.drawCentredString(width / 2, 40, "Gracias por confiar en nosotros. Ante cualquier consulta, escribinos a facturacion@alimentapp.com")

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
    payload = json.loads(body) if isinstance(body, str) else body

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
