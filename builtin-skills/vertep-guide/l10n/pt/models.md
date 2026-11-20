<!-- source: cb493ace9db7 -->
# Modelos e conexões

O Molfar e seus apps precisam de um modelo de IA para responder. Esta página explica como conectar um, escolher quais modelos aparecem e configurar imagens e voz. Tudo fica em Configurações.

## Conexões

Uma conexão é um link salvo para um provedor ou servidor. Abra Configurações, depois "Conexões e modelos", depois "Adicionar conexão". A lista de provedores oferece:

- Provedores conhecidos: escolha um e cole a chave de API dele.
- "Assinaturas (OAuth)": você entra em vez de colar uma chave.
- "Modelo local": Ollama, LM Studio, llama.cpp e outros rodando no seu próprio computador.
- "Endpoint personalizado": qualquer servidor que fale um dos formatos suportados, como o compatível com OpenAI.

Uma conexão mostra "Conectado" quando tem uma chave (ou não precisa de nenhuma) e "Falta a chave" caso contrário. Isso não é um teste de que o modelo funciona. As chaves ficam armazenadas somente neste computador.

## Escolhendo quais modelos aparecem

Uma conexão pode trazer centenas de modelos. Na lista abaixo das conexões:

- Marque os modelos que os seletores devem mostrar. Se nada estiver marcado, todos aparecem.
- Dê estrela aos que você alterna. Eles formam a "Troca rápida" e vêm primeiro nos seletores de modelo, nos chats do Molfar e nos apps.
- Use o ícone de controles para abrir as configurações de um modelo.

## Configurações por modelo

As configurações de um modelo incluem a janela de contexto, tokens máximos de saída, raciocínio, preços (em dólares por milhão de tokens), uma verificação de cache de prompts, um tempo de vida do cache e os parâmetros de amostragem, como penalidades e Min P. "Verificar o cache" informa se o provedor lê um prompt repetido do cache dele, o que é mais barato e mais rápido. O tempo de vida do cache tem três opções: "Do próprio provedor" (geralmente cerca de 5 minutos, nada extra é enviado), "Long" (pede uma hora com o Claude e até um dia com o GPT; sem requisições extras, gravar o cache custa mais; oferecido apenas em conexões que o respeitam: a própria Anthropic, o Claude via OpenRouter e a OpenAI, e esmaecido nos demais, porque um gateway pode ignorá-lo ou recusar a requisição) e "Keep alive" (após uma resposta do chat, o motor envia uma pequena requisição a cada 5 minutos por até 40 minutos para que o cache não expire; custa cerca de um décimo do preço de entrada do prompt a cada vez, conta contra limites de requisições e assinaturas, exige que os preços do modelo estejam definidos e não é usado com ferramentas, nem com raciocínio no Claude (uma requisição com o raciocínio do Claude precisa de uma resposta maior do que os 16 tokens de uma requisição de keep-alive); não escreve nada no chat, o painel conta as requisições e, quando ele não está rodando, o painel diz por quê). Comece com "Long" para o Claude na Anthropic ou no OpenRouter: não precisa de requisições extras. O Claude através de um gateway como o NanoGPT ignora o tempo de vida longo, e os modelos Gemini lá fazem cache por conta própria por alguns minutos: use Keep alive para esses. No Roleplay, o botão Request size no cabeçalho do chat mostra quanto da última requisição veio do cache e onde, no prompt, o cache termina. O Keep alive é para provedores sem opção longa, e não para modelos gratuitos com limite diário de requisições. "Configurações recomendadas" pode preencher valores sensatos, e Reverter volta atrás. Blocos separados podem se aplicar ao Molfar, às respostas de chat nos apps ou a um plugin individual. Os campos que você deixa desligados não são enviados.

## Modelo de visão

Os apps enviam imagens para este modelo, por exemplo para descrever um personagem a partir de um retrato. "Auto" usa o modelo mais barato que lê imagens. Se nenhum dos seus consegue, adicione uma conexão com um.

## Imagens

"Imagens" em Configurações configura a geração de imagens para todos os apps. Você pode adicionar modelos de imagem das suas conexões ou servidores de imagem: um ComfyUI, um servidor AUTOMATIC1111 ou Forge iniciado com a API ligada, ou qualquer serviço com endpoint de imagens. Um ComfyUI também pode ser um no RunPod Serverless: escolha ComfyUI, informe como endereço `https://api.runpod.ai/v2/` seguido do id do seu endpoint, como chave a sua chave de API do RunPod, e em "Modelos" os nomes dos arquivos de checkpoint no seu worker (o RunPod não consegue listá-los); "Verificar" informa se o id do endpoint e a chave estão corretos. A primeira imagem pode levar até meio minuto enquanto o worker inicia. Os modelos de imagem com estrela viram favoritos. O Molfar escolhe entre eles conforme a finalidade de cada um, e o Roleplay os lista primeiro no seletor dele.

## Voz

"Voz" dá texto em fala para todos os apps. As vozes gratuitas do Edge funcionam de imediato; cada uma tem um botão "Testar". Você também pode "Adicionar endpoint" para um serviço de voz (OpenAI, Groq ou um servidor local) com um nome de modelo, uma voz padrão e uma chave.

## Custo e modelos pequenos

- O Molfar mostra uma estimativa de custo antes de tarefas grandes e imagens pagas. Veja "Verificações de custo" em Configurações, Molfar.
- Um modelo com uma janela de contexto pequena pode se afogar nas instruções completas do Molfar. O "Modo de modelo pequeno" envia um prompt mais curto. O padrão, Auto, liga com 32k tokens ou menos, ou quando o tamanho é desconhecido.

Veja também [[settings]] e [[first-steps]].
