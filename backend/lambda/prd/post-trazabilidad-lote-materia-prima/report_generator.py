"""
Reporte de trazabilidad de lote - Versión con Diseño Mejorado
Usa Platypus para un layout profesional, limpio y adaptable.
Requiere: pip install reportlab
"""
import io
from datetime import datetime, date
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, Flowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ------------------------------------
# --- 1. Configuración ---
# ------------------------------------

PAGE_SIZE = LETTER
MARGIN_MM = 18

# --- Paleta de Colores ---
VIOLETA_OSCURO = colors.HexColor('#221E5F')      # primary.DEFAULT
VIOLETA_MEDIO = colors.HexColor('#8E01FB')       # primary.secondary
LAVANDA_FONDO = colors.HexColor('#F3F4F6')       # neutral.gray-100
BORDE_SUAVE = colors.HexColor('#CCCCCC')         # neutral.light
GRIS_TEXTO = colors.HexColor('#111827')          # neutral.dark
# Colores semánticos se mantienen
COLOR_VERDE = colors.HexColor('#2f855a')
COLOR_NARANJA = colors.HexColor('#dd6b20')
COLOR_ROJO = colors.HexColor('#c53030')

# ------------------------------------
# --- 2. Estilos y Helpers ---
# ------------------------------------

# --- Registro de Fuentes (para soportar acentos) ---
try:
    pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    BASE_FONT = 'DejaVuSans'
except Exception:
    BASE_FONT = 'Helvetica' # Fallback

# --- Estilos de Párrafo ---
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='Body', parent=styles['Normal'], fontName=BASE_FONT, fontSize=10, leading=14, splitLongWords=True))
styles.add(ParagraphStyle(name='BodyBold', parent=styles['Body'], fontName=BASE_FONT + '-Bold'))
styles.add(ParagraphStyle(name='TitleSection', parent=styles['Heading2'], fontName=BASE_FONT, fontSize=14, textColor=VIOLETA_OSCURO, spaceAfter=12))
styles.add(ParagraphStyle(name='TitleSectionCentered', parent=styles['TitleSection'], alignment=1))
styles.add(ParagraphStyle(name='Footer', parent=styles['Normal'], fontName=BASE_FONT, fontSize=8, textColor=GRIS_TEXTO, alignment=1))

# --- Helpers ---
def formato_fecha(d):
    if isinstance(d, datetime): return d.strftime('%d/%m/%Y %H:%M')
    if isinstance(d, date): return d.strftime('%d/%m/%Y')
    return str(d)

def formato_estado_op(estado_raw):
    """Formatea el texto del estado para visualización."""
    if not estado_raw:
        return "N/A"
    return estado_raw.replace('_', ' ').capitalize()

def color_estado(estado_texto):
    e = estado_texto.lower()
    if 'finalizada' in e: return COLOR_VERDE
    if 'en proceso' in e: return COLOR_NARANJA
    return COLOR_ROJO

class GradientLine(Flowable):
    """Flowable para dibujar una línea con gradiente."""
    def __init__(self, width, height=1.5):
        Flowable.__init__(self)
        self.width = width
        self.height = height

    def draw(self):
        inicio = VIOLETA_MEDIO
        fin = BORDE_SUAVE # Usar el nuevo color de borde para consistencia
        pasos = 100
        for i in range(pasos):
            ratio = i / (pasos - 1)
            r = inicio.red + (fin.red - inicio.red) * ratio
            g = inicio.green + (fin.green - inicio.green) * ratio
            b = inicio.blue + (fin.blue - inicio.blue) * ratio
            self.canv.setFillColor(colors.Color(r, g, b))
            x_actual = (self.width * i) / pasos
            self.canv.rect(x_actual, 0, (self.width / pasos) + 1, self.height, fill=True, stroke=False)

# ------------------------------------
# --- 3. Construcción del Documento ---
# ------------------------------------

def build_story(lote_materia_prima, ordenes_de_produccion):
    story = []
    margin = MARGIN_MM * mm
    content_width = PAGE_SIZE[0] - 2 * margin

    # --- Título Principal ---
    story.append(Paragraph("Reporte de Trazabilidad de Lote", ParagraphStyle(name='MainTitle', parent=styles['h1'], alignment=1, fontSize=20, textColor=VIOLETA_OSCURO)))
    story.append(Spacer(1, 12))

    # --- Tarjeta de Información del Lote ---
    story.append(Paragraph("Información del Lote de Materia Prima", styles['TitleSection']))
    
    lote_data = [
        [Paragraph(f"<b>Materia Prima:</b> {lote_materia_prima['nombre_materia_prima']}", styles['Body'])],
        [Paragraph(f"<b>Código de Lote:</b> {lote_materia_prima['codigo_lote']}", styles['Body'])],
        [Paragraph(f"<b>Proveedor:</b> {lote_materia_prima['proveedor']}", styles['Body'])],
        [Paragraph(f"<b>Fecha de Ingreso:</b> {formato_fecha(lote_materia_prima['fecha_ingreso'])}", styles['Body'])],
    ]
    lote_table = Table(lote_data, colWidths=[content_width - 24])
    lote_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LAVANDA_FONDO),
        ('BOX', (0,0), (-1,-1), 1, BORDE_SUAVE),
        ('INNERPADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(lote_table)
    story.append(Spacer(1, 25))

    # --- Nueva Sección: Resumen de Consumo ---
    total_consumido = sum(o['cantidad_utilizada'] for o in ordenes_de_produccion)
    # Usamos la cantidad disponible directamente de la base de datos
    cantidad_disponible_actual = lote_materia_prima.get('cantidad_unitaria_disponible', Decimal('0.00'))
    vencido = lote_materia_prima.get('fecha_vencimiento') and lote_materia_prima['fecha_vencimiento'] < date.today()
    
    if cantidad_disponible_actual == 0:
        estado_restante = f"<font color='{COLOR_ROJO}'>Agotado</font>"
    elif vencido:
        estado_restante = f"<font color='{COLOR_ROJO}'>Vencido desde {formato_fecha(lote_materia_prima['fecha_vencimiento'])}</font>"
    else:
        estado_restante = f"<font color='{COLOR_VERDE}'>Disponible</font>"

    resumen_data = [
        [Paragraph(f"<b>Total Consumido del Lote:</b> {total_consumido} {lote_materia_prima['unidad_medida']}", styles['Body'])],
        [Paragraph(f"<b>Cantidad Restante:</b> {cantidad_disponible_actual} {lote_materia_prima['unidad_medida']}", styles['Body'])],
        [Paragraph(f"<b>Estado del Restante:</b> {estado_restante}", styles['Body'])],
    ]
    resumen_table = Table(resumen_data, colWidths=[content_width - 24])
    resumen_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LAVANDA_FONDO),
        ('BOX', (0,0), (-1,-1), 1, BORDE_SUAVE),
        ('INNERPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(resumen_table)
    story.append(Spacer(1, 30))

    # --- Sección de Órdenes de Producción ---
    story.append(Paragraph("Órdenes de Producción Asociadas", styles['TitleSectionCentered']))
    story.append(GradientLine(content_width))
    story.append(Spacer(1, 15))

    for orden in ordenes_de_produccion:
        cliente = orden.get('cliente', {})
        
        # Datos para las dos columnas de la tarjeta
        op_details = [
            Paragraph(f"<b>Orden de Producción N° {orden['id']}</b>", styles['BodyBold']),
            Spacer(1, 6),
            Paragraph(f"<b>Producto:</b> {orden['producto_nombre']}", styles['Body']),
            Paragraph(f"<b>Estado:</b> <font color='{color_estado(orden['estado']).hexval()}'>{formato_estado_op(orden['estado'])}</font>", styles['Body']),
            Paragraph(f"<b>Consumo del Lote:</b> {orden['cantidad_utilizada']} {lote_materia_prima['unidad_medida']}", styles['Body']),
        ]
        
        client_details = [
            Paragraph("<b>Cliente Asociado</b>", styles['BodyBold']),
            Spacer(1, 6),
            Paragraph(f"{cliente.get('razon_social','N/D')}", styles['Body']),
            Paragraph(f"<b>C.U.I.T.:</b> {cliente.get('cuil','N/D')}", styles['Body']),
            Paragraph(f"<b>Contacto:</b> {cliente.get('nombre_contacto','N/D')}", styles['Body']),
            Paragraph(f"<b>Email:</b> {cliente.get('email','N/D')}", styles['Body']),
            Paragraph(f"<b>Teléfono:</b> {cliente.get('telefono','N/D')}", styles['Body']),
        ]

        # Tabla que estructura la tarjeta
        card_table = Table([[op_details, client_details]], colWidths=[content_width/2 - 15, content_width/2 - 15])
        card_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), LAVANDA_FONDO),
            ('BOX', (0,0), (-1,-1), 1, BORDE_SUAVE),
            ('INNERPADDING', (0,0), (-1,-1), 15),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            # Línea vertical divisoria
            ('LINEBEFORE', (1,0), (1,0), 1, BORDE_SUAVE),
        ]))
        
        story.append(KeepTogether([card_table]))
        story.append(Spacer(1, 30)) # Espacio generoso entre tarjetas

    return story

# ------------------------------------
# --- 4. Header/Footer y Generación ---
# ------------------------------------

def draw_header_footer(canvas, doc):
    """Dibuja el pie de página en cada hoja."""
    canvas.saveState()
    canvas.setFont(BASE_FONT, 8)
    canvas.setFillColor(GRIS_TEXTO)
    canvas.drawCentredString(PAGE_SIZE[0]/2, MARGIN_MM*mm / 2, f"Página {doc.page} | Reporte de Trazabilidad de Lote")
    canvas.restoreState()

def generar_pdf(lote_materia_prima, ordenes_de_produccion):
    """Función principal que crea y devuelve el documento PDF como bytes."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=PAGE_SIZE,
        leftMargin=MARGIN_MM*mm, rightMargin=MARGIN_MM*mm,
        topMargin=MARGIN_MM*mm, bottomMargin=MARGIN_MM*mm
    )
    story = build_story(lote_materia_prima, ordenes_de_produccion)
    doc.build(story, onFirstPage=draw_header_footer, onLaterPages=draw_header_footer)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes