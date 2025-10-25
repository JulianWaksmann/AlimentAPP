import importlib.util
import pathlib
import types
import unittest
from datetime import datetime, timezone
from decimal import Decimal


def load_module() -> types.ModuleType:
    root = pathlib.Path(__file__).resolve().parents[1]
    module_path = root / "lambda" / "prd" / "planificador_ordenes_produccion" / "handler.py"
    spec = importlib.util.spec_from_file_location("planificador_handler", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)  # type: ignore[arg-type]
    return module


PLANIFICADOR = load_module()


class OrdenamientoTest(unittest.TestCase):
    def test_ordenar_por_fecha_entrega(self):
        ordenes = [
            {
                "id": 2,
                "fecha_entrega_solicitada": datetime(2025, 10, 20, tzinfo=timezone.utc),
                "fecha_creacion": datetime(2025, 10, 10, tzinfo=timezone.utc),
            },
            {
                "id": 1,
                "fecha_entrega_solicitada": datetime(2025, 10, 15, tzinfo=timezone.utc),
                "fecha_creacion": datetime(2025, 10, 9, tzinfo=timezone.utc),
            },
            {
                "id": 3,
                "fecha_entrega_solicitada": None,
                "fecha_creacion": datetime(2025, 10, 8, tzinfo=timezone.utc),
            },
        ]

        PLANIFICADOR.ordenar_ordenes(ordenes)

        self.assertEqual([orden["id"] for orden in ordenes], [1, 2, 3])


class SeleccionLineaTest(unittest.TestCase):
    def test_selecciona_linea_con_menor_secuencia_y_carga(self):
        disponibilidad = {
            1: {"sec": 3, "carga_planificada": Decimal("50"), "capacidad": Decimal("200")},
            2: {"sec": 2, "carga_planificada": Decimal("80"), "capacidad": Decimal("200")},
            3: {"sec": 2, "carga_planificada": Decimal("40"), "capacidad": Decimal("200")},
        }
        linea = PLANIFICADOR.seleccionar_linea([1, 2, 3], disponibilidad)
        self.assertEqual(linea, 3)

    def test_devuelve_none_si_no_hay_lineas_compatibles(self):
        disponibilidad = {1: {"sec": 1, "carga_planificada": Decimal("0"), "capacidad": Decimal("200")}}
        linea = PLANIFICADOR.seleccionar_linea([], disponibilidad)
        self.assertIsNone(linea)


if __name__ == "__main__":
    unittest.main()
