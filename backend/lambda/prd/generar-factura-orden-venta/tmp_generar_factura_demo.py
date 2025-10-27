from datetime import datetime
from decimal import Decimal
import importlib.util
import os
import sys
import types

BASE_DIR = os.path.dirname(__file__)
LAYER_PATH = os.path.join(BASE_DIR, "layer", "python")
if LAYER_PATH not in sys.path:
    sys.path.insert(0, LAYER_PATH)

# Stubs para evitar dependencias externas durante la demo local.
class _BotoStub(types.SimpleNamespace):
    def client(self, name, *_, **__):
        class _DummyClient:
            def __getattr__(self, attr):
                def _stub(*args, **kwargs):
                    raise RuntimeError(f"Stubbed boto3 client '{name}' method '{attr}' invoked")
                return _stub
        return _DummyClient()

class _PgStub(types.SimpleNamespace):
    def connect(self, *args, **kwargs):
        raise RuntimeError("pg8000 connect stubbed for local demo")

sys.modules.setdefault("boto3", _BotoStub())
sys.modules.setdefault("pg8000", _PgStub())

MODULE_PATH = os.path.join(BASE_DIR, "generar-factura-orden-venta.py")
spec = importlib.util.spec_from_file_location("generar_factura_module", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

generar_pdf_factura = module.generar_pdf_factura

orden = {
    "id": 123,
    "estado": "confirmada",
    "fecha_pedido": datetime(2024, 9, 18, 10, 30),
    "fecha_entrega_solicitada": datetime(2024, 9, 25, 15, 0),
    "razon_social": "Cliente Demo SA",
    "cuil": "30-12345678-9",
    "nombre_contacto": "Juan",
    "apellido_contacto": "Perez",
    "telefono": "+54 11 5555-1234",
    "email": "cliente@example.com",
    "observaciones": "Entrega en deposito central.",
}

items = [
    {
        "producto": "Caja de empanadas",
        "descripcion": "Empanadas congeladas de carne (12 unidades)",
        "cantidad": Decimal("10"),
        "precio_venta": Decimal("1500.50"),
    },
    {
        "producto": "Caja de tartas",
        "descripcion": "Tartas de verdura al horno (6 unidades)",
        "cantidad": Decimal("5"),
        "precio_venta": Decimal("2100.75"),
    },
]

pdf_bytes = generar_pdf_factura(orden, items)

output_path = os.path.join(BASE_DIR, "factura_demo.pdf")
with open(output_path, "wb") as f:
    f.write(pdf_bytes)

print(f"PDF generado: {output_path} ({len(pdf_bytes)} bytes)")
