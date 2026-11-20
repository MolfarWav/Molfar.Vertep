<!-- source: cb493ace9db7 -->
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

Los ajustes de un modelo incluyen su ventana de contexto, tokens máximos de salida, razonamiento, precios (en dólares por millón de tokens), una comprobación de caché de prompts, una vida útil de la caché y los parámetros de muestreo, como penalizaciones y Min P. «Comprobar la caché» te dice si el proveedor lee un prompt repetido de su caché, lo que es más barato y rápido. La vida útil de la caché tiene tres opciones: «La del proveedor» (normalmente unos 5 minutos, no se envía nada extra), «Larga» (pide una hora con Claude y hasta un día con GPT; no hay peticiones extra, escribir la caché cuesta más; se ofrece solo en las conexiones que la respetan: Anthropic mismo, Claude a través de OpenRouter y OpenAI, y aparece atenuada en las demás, porque una pasarela puede ignorarla o rechazar la petición) y «Mantener viva» (tras una respuesta del chat, el motor envía una petición pequeña cada 5 minutos aproximadamente durante hasta 40 minutos para que la caché no caduque; cuesta alrededor de una décima parte del precio de entrada del prompt cada vez, cuenta para los límites de peticiones y las suscripciones, necesita que los precios del modelo estén configurados y no se usa con herramientas, ni con el pensamiento activado en Claude (una petición con el pensamiento de Claude necesita una respuesta mayor que los 16 tokens que tiene una petición de mantenimiento); no escribe nada en el chat, el panel cuenta las peticiones y, cuando no está en marcha, el panel dice por qué). Empieza con «Larga» para Claude en Anthropic u OpenRouter: no necesita peticiones extra. Claude a través de una pasarela como NanoGPT ignora la vida útil larga, y los modelos Gemini de allí cachean por sí solos durante unos minutos: usa Mantener viva para esos. En Roleplay, el botón Request size de la cabecera del chat muestra cuánto de la última petición vino de la caché y dónde termina la caché en el prompt. Mantener viva es para proveedores sin opción larga, y no para modelos gratuitos con un límite diario de peticiones. «Ajustes recomendados» puede rellenar valores sensatos, y Revertir vuelve atrás. Bloques separados pueden aplicarse a Molfar, a las respuestas de chat en apps o a un plugin individual. Los campos que dejas desactivados no se envían.

## Modelo de visión

Las apps envían imágenes a este modelo, por ejemplo para describir un personaje a partir de un retrato. «Auto» toma el modelo más barato que puede leer imágenes. Si ninguno de los tuyos puede, añade una conexión con uno.

## Imágenes

«Imágenes» en Ajustes configura la generación de imágenes para todas las apps. Puedes añadir modelos de imagen desde tus conexiones, o servidores de imágenes: un ComfyUI, un servidor AUTOMATIC1111 o Forge iniciado con su API activada, o cualquier servicio con un endpoint de imágenes. Un ComfyUI también puede ser uno en RunPod Serverless: elige ComfyUI, escribe `https://api.runpod.ai/v2/` seguido de tu id de endpoint como dirección, tu clave de API de RunPod como clave, y en "Modelos" los nombres de archivo de checkpoint de tu worker (RunPod no puede listarlos); "Comprobar" te dice si el id de endpoint y la clave son correctos. La primera imagen puede tardar hasta medio minuto mientras el worker arranca. Los modelos de imagen marcados con estrella se vuelven favoritos. Molfar elige entre ellos según para qué sirve cada uno, y Roleplay los muestra primero en su selector.

## Voz

«Voz» da texto a voz a todas las apps. Las voces de Edge gratuitas funcionan de inmediato; cada una tiene un botón «Probar». También puedes «Añadir endpoint» para un servicio de voz (OpenAI, Groq o un servidor local) con un nombre de modelo, una voz predeterminada y una clave.

## Coste y modelos pequeños

- Molfar muestra una estimación de coste antes de tareas grandes e imágenes de pago. Consulta «Control de costes» en Ajustes, Molfar.
- Un modelo con una ventana de contexto pequeña puede ahogarse en las instrucciones completas de Molfar. «Modo para modelos pequeños» envía un prompt más corto. Su valor predeterminado, Auto, se activa con 32k tokens o menos, o cuando se desconoce el tamaño.

Consulta también [[settings]] y [[first-steps]].
