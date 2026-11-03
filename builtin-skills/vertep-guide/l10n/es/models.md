<!-- source: 41cddad16b7f -->
# Modelos y conexiones

Molfar y tus apps necesitan un modelo de IA para responder. Esta página explica cómo conectar uno, elegir qué modelos aparecen y configurar imágenes y voz. Todo vive en Ajustes.

## Conexiones

Una conexión es un enlace guardado a un proveedor o servidor. Abre Ajustes, luego «Conexiones y modelos» y luego «Añadir conexión». La lista de proveedores ofrece:

- Proveedores conocidos: elige uno y pega su clave de API.
- «Suscripciones (OAuth)»: inicias sesión en lugar de pegar una clave.
- «Modelo local»: Ollama, LM Studio, llama.cpp y otros que se ejecutan en tu propio ordenador.
- «Endpoint personalizado»: cualquier servidor que hable uno de los formatos admitidos, como compatible con OpenAI.

Una conexión dice «Conectado» cuando tiene una clave (o no necesita ninguna) y «Falta la clave» en caso contrario. Eso no es una prueba de que el modelo funcione. Las claves se guardan solo en este ordenador.

## Elegir qué modelos aparecen

Una conexión puede traer cientos de modelos. En la lista debajo de las conexiones:

- Marca los modelos que deben mostrar los selectores. Si no hay ninguno marcado, se muestran todos.
- Marca con la estrella los que alternas. Estos forman el «Cambio rápido» y van primero en los selectores de modelo, en los chats de Molfar y en las apps.
- Usa el icono de controles para abrir los ajustes propios de un modelo.

## Ajustes por modelo

Los ajustes de un modelo incluyen su ventana de contexto, tokens máximos de salida, razonamiento, precios (en dólares por millón de tokens), una comprobación de caché de prompts y los parámetros de muestreo, como penalizaciones y Min P. «Ajustes recomendados» puede rellenar valores sensatos, y Revertir vuelve atrás. Bloques separados pueden aplicarse a Molfar, a las respuestas de chat en apps o a un plugin individual. Los campos que dejas desactivados no se envían.

## Modelo de visión

Las apps envían imágenes a este modelo, por ejemplo para describir un personaje a partir de un retrato. «Auto» toma el modelo más barato que puede leer imágenes. Si ninguno de los tuyos puede, añade una conexión con uno.

## Imágenes

«Imágenes» en Ajustes configura la generación de imágenes para todas las apps. Puedes añadir modelos de imagen desde tus conexiones, o servidores de imágenes: un ComfyUI, un servidor AUTOMATIC1111 o Forge iniciado con su API activada, o cualquier servicio con un endpoint de imágenes. Los modelos de imagen marcados con estrella se vuelven favoritos. Molfar elige entre ellos según para qué sirve cada uno, y Roleplay los muestra primero en su selector.

## Voz

«Voz» da texto a voz a todas las apps. Las voces de Edge gratuitas funcionan de inmediato; cada una tiene un botón «Probar». También puedes «Añadir endpoint» para un servicio de voz (OpenAI, Groq o un servidor local) con un nombre de modelo, una voz predeterminada y una clave.

## Coste y modelos pequeños

- Molfar muestra una estimación de coste antes de tareas grandes e imágenes de pago. Consulta «Control de costes» en Ajustes, Molfar.
- Un modelo con una ventana de contexto pequeña puede ahogarse en las instrucciones completas de Molfar. «Modo para modelos pequeños» envía un prompt más corto. Su valor predeterminado, Auto, se activa con 32k tokens o menos, o cuando se desconoce el tamaño.

Consulta también [[settings]] y [[first-steps]].
