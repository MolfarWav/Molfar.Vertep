<!-- source: c3880a3f342c -->
# Molfar, tu agente

Molfar es el agente de IA integrado en Molfar Vertep. Aquí todo son archivos simples, y él edita esos archivos por ti. Lee esta página si quieres cambiar algo de tus apps y no quieres hacerlo a mano.

## Dónde vive

Abre la fila «Molfar» en la página de inicio. Tiene su propia pestaña, la página del agente. Escribe en la caja y pulsa Enter para enviar (en un teléfono, Enter hace un salto de línea y el botón de flecha envía). Escribe `/` para comandos y plantillas, o `@` para nombrar un archivo, personaje, lorebook o preset para que mire exactamente ese.

Con una app abierta, «Dividir» pone a Molfar a la izquierda y la app en vivo a la derecha, para que la veas cambiar mientras preguntas. En un teléfono es simplemente otra pestaña.

## Qué puede hacer

- Cambiar una app: sus pantallas, comportamiento, colores, disposición.
- Crear una app nueva desde una base y luego desarrollarla contigo.
- Editar datos dentro de las apps, por ejemplo tarjetas de personaje y lorebooks, incluso muy grandes.
- Añadir plugins y cambiar temas.
- Generar imágenes con los modelos de imagen que configures.
- Guardar notas y proponer entradas de memoria y habilidades.
- Si eres el administrador, ayudar con cuentas y ajustes del servidor. Cada cambio de ese tipo espera tu aprobación.

Mira antes de cambiar, trabaja en pasos pequeños, revisa su trabajo y termina con un informe breve de qué cambió y cómo deshacerlo.

## Qué pide primero

- **Peticiones grandes o poco claras.** Para una app nueva o una función grande, hace primero unas preguntas con opciones.
- **Archivos protegidos.** Por defecto, los archivos fuente de una app y su página principal están protegidos, igual que sus propias instrucciones permanentes y el archivo de parámetros del modelo. Una tarjeta pregunta «Permitir» o «No permitir», y la respuesta cubre solo esa solicitud. Editas la lista en Ajustes, Molfar.
- **Coste.** Antes de una tarea grande, una generación de prueba de pago o una imagen de pago, muestra una estimación y espera tu sí. Cambia esto en Ajustes, Molfar, Control de costes.
- **Comandos de shell.** Según el modo, abajo.

## Modo

El selector de modo en la cabecera decide qué puede hacer sin preguntar:

- **Completo** planea primero los cambios grandes y luego edita y ejecuta comandos.
- **Aceptar** omite el paso de planear y pregunta antes de cada comando de shell.
- **Planear** solo lee y planea, y no cambia nada. Después de un plan, «Aplicar propuesta» sale del modo y lo lleva a cabo.

## Cómo deshacer

Debajo de una respuesta que cambió una app ves «Cambiada <app> · N archivos · Deshacer». Deshacer pregunta primero y luego devuelve el código de la app a como estaba antes de esa ejecución. Tus chats y subidas se quedan. La página del proyecto de una app también tiene Puntos de control: puntos guardados del código de la app, que Molfar toma antes de cambiarla. Puedes añadir los tuyos con «Guardar punto de control», y Restaurar pregunta primero. Cada restauración se guarda a su vez, así que se puede deshacer.

## Memoria y habilidades

El botón del cerebro abre «Memoria y habilidades». La memoria guarda lo que él conserva entre chats; propone entradas y solo guarda una cuando estás de acuerdo. Las habilidades son instrucciones cortas para un tipo de trabajo; «Nueva habilidad» escribe una e «Mejorar con Molfar» la refina. Consulta [[projects-and-chats]] para las específicas del proyecto.

## Bueno saber

- Modelos pequeños o gratuitos: «Modo para modelos pequeños» en Ajustes, Molfar envía un prompt más corto.
- El botón del ojo, el inspector de prompts, muestra lo que de verdad se envió al modelo.
- Los chats largos se pueden doblar en un resumen con «Compactar conversación» o `/compact`.
- Las palabras usadas aquí se explican en [[glossary]].
