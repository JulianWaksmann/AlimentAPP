# Lambda: Reporte de Trazabilidad de Lote de Materia Prima

Esta función Lambda (`post-trazabilidad-lote-materia-prima`) genera un reporte en formato PDF sobre la trazabilidad de un lote específico de materia prima.

## Funcionalidad Principal

1.  **Recepción de Solicitud**: La Lambda está diseñada para ser invocada a través de API Gateway.
2.  **Obtención de Datos**: Se conecta a la base de datos RDS para obtener la información detallada del lote de materia prima solicitado y todas las órdenes de producción en las que se ha utilizado.
3.  **Generación de PDF**: Utiliza el módulo `report_generator.py` y la librería `reportlab` para construir un documento PDF en memoria con toda la información recopilada.
4.  **Formato de Respuesta**: La Lambda codifica el PDF en Base64 y lo devuelve en una estructura JSON específica que API Gateway interpreta para servirlo como una descarga de archivo en el navegador del cliente.

## Invocación vía API Gateway

La función debe ser invocada utilizando el método `POST`.

### Método POST

-   **Endpoint**: `/reporte/trazabilidad` (o el endpoint configurado en API Gateway)
-   **Descripción**: El ID del lote se envía en el cuerpo (body) de la solicitud en formato JSON.
-   **Ejemplo de Body**: 
    ```json
    {
        "lote_id": 710
    }
    ```

## Respuesta Exitosa (Código 200)

Si la operación es exitosa, la Lambda devuelve una respuesta con las siguientes características, diseñadas para que el navegador inicie una descarga:

-   **`statusCode`**: `200`
-   **`headers`**:
    -   `Content-Type`: `application/pdf`
    -   `Content-Disposition`: `attachment; filename="reporte_trazabilidad_lote_... .pdf"`
-   **`body`**: Una cadena de texto larga que es el contenido del PDF codificado en Base64.
-   **`isBase64Encoded`**: `true`

## Archivos del Módulo

-   `handler.py`: Contiene el `lambda_handler`, que es el punto de entrada. Se encarga de la lógica de negocio: procesar el evento de API Gateway, conectarse a la base de datos, ejecutar las consultas SQL de forma segura (usando consultas parametrizadas para evitar inyección SQL) y formatear la respuesta final.
-   `report_generator.py`: Módulo de presentación. Su única responsabilidad es recibir los datos del lote y las órdenes de producción, y generar el documento PDF con el estilo y formato definidos.
