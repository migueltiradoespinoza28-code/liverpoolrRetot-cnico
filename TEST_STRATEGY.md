# Estrategia de pruebas

En producción no se prueba, solo se ratifica. Aquí no hay ambiente de QA, así que este flujo corre contra liverpool.com.mx como una ratificación de solo lectura.

## 1. ¿Qué no automatizaría y por qué?

No automatizaría la validación fina de diseño visual (UI/UX), la evaluación de usabilidad ni la verificación visual de la calidad de imagen de banners o productos, porque son juicios subjetivos: un script detecta si algo cambió, no si se ve bien o confunde al cliente. Por lo mismo valido a mano la relevancia de los resultados (al buscar "playstation 5" sale una taza infantil) y la calidad del filtro de color (con "Blanco", 4 de los 10 primeros productos están registrados como "Sin color"). En los dos casos el test pasa porque la UI y la API coinciden.

## 2. ¿Cómo gestionaría el CAPTCHA?

El CAPTCHA no se automatiza ni se intenta saltar, porque está hecho para bloquear bots. Lo gestionaría por ambiente:
- **QA/staging:** desarrollo lo desactiva con una variable de entorno o con las llaves de prueba del proveedor. Ahí corre toda la regresión automatizada de búsqueda.
- **Producción:** no crearía un pase automático, porque sería abrir un hueco en el mismo control que protege contra bots. La ratificación del paso con CAPTCHA se hace manual después del despliegue: una persona confirma que la búsqueda funciona y que el CAPTCHA aparece y bloquea. Lo automatizado en producción llega hasta antes del CAPTCHA.
- **En la suite:** si el CAPTCHA aparece en un ambiente donde debería estar apagado, el test falla con un mensaje claro de bloqueo anti-bot, para que no se reporte como un defecto de búsqueda.

## 3. ¿Qué riesgos de inestabilidad hay y cómo los mitigué?

- **Página que no terminaba de cargar:** el Enter y los menús a veces no respondían. Reintento la acción hasta confirmar que se ejecutó.
- **Lista desactualizada:** leía productos antes de que se actualizaran. Espero a que la pantalla muestre lo mismo que respondió la API.
- **Pop-ups (cookies, ubicación, promociones):** un manejador global los cierra antes de cada acción.
- **Cambio de diseño del sitio:** uso selectores `data-testid` centralizados en un solo archivo.
- **Anuncio patrocinado fuera de orden:** tomo solo resultados orgánicos.

## 4. ¿Qué cambiaría en un pipeline con más de 50 suites?

- Correr esta suite en staging; en producción, solo la ratificación después de cada despliegue.
- En cada PR, solo el flujo crítico (menos de 10 minutos); navegadores, accesibilidad y visual, de noche.
- Ejecutar en paralelo con sharding de Playwright para no alargar el pipeline.
- Máximo 2 reintentos; lo que pase en reintento va a cuarentena con un responsable.
- Reporte unificado de todas las suites y un dueño que recibe la alerta si falla.
