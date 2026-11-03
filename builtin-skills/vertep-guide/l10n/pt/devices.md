<!-- source: abe560e8cdbc -->
# Dispositivos, sincronização e backups

Como usar o Molfar Vertep em um celular, levar suas histórias entre dispositivos, instalá-lo como um app e mudar para um computador novo.

## Abrindo pelo celular

Em Configurações, Servidor, "Permitir outros dispositivos da minha rede" deixa um celular ou outro computador na mesma rede abrir o Molfar Vertep. Um código QR mostra o endereço; escaneie com a câmera do celular. Cada conta continua precisando da senha. Celulares só permitem o microfone e instalar como app via HTTPS, então para isso você liga "Usar HTTPS" na mesma seção. Essas seções ficam visíveis para o administrador.

## Instale como um app

"Instalar app" no menu da conta coloca o Molfar Vertep na sua tela inicial ou na lista de apps do computador. Ele então abre em sua própria janela, sem a barra do navegador. Em um iPhone, mostra onde o Safari guarda: Compartilhar e depois Adicionar à Tela de Início. Um celular que abre seu computador em um endereço http precisa de https primeiro, e a caixa de diálogo explica como. Um app aberto também tem "Tela cheia", que o abre em uma aba própria do navegador que você pode instalar.

## Sincronização

"Sincronizar dispositivos" no menu da conta, ou Configurações, Sincronização. Entre com o Google uma vez em cada dispositivo. Quando parar de jogar, pressione "Enviar"; no outro dispositivo, pressione "Receber" e continue. Depois da primeira vez, só o que mudou viaja.

- Você escolhe o que viaja: apps e seus dados, os chats e projetos do Molfar, imagens, som e vídeo, e chaves de API com configurações MCP. As chaves viajam apenas se você ligá-las, protegidas com uma frase-passe que você digita em cada dispositivo.
- Se o mesmo chat mudou nos dois dispositivos, você escolhe qual versão manter. A outra fica salva por 30 dias.
- Há também uma opção "Pasta" para uma pasta sincronizada (Syncthing, Google Drive para computador) ou um pen drive.

## Backup

Configurações, Cópia de segurança exporta todo o seu perfil: apps com seus dados, a memória do Molfar e os chats. Pressione "Exportar perfil". Adicione uma senha para incluir suas chaves de API, cifradas; sem ela, o backup não tem chaves e você as digita de novo. A importação primeiro mostra o que há dentro. Quando você pressiona "Substituir o meu perfil", seu perfil atual é salvo antes de ser substituído.

Use o Backup para mudar para um computador novo uma vez. Use a Sincronização para ir e voltar com frequência.

## Apenas um app

Os detalhes de um app na página inicial têm "Exportar app", que faz um arquivo de backup só desse app. "Importar app" traz esse arquivo de volta. Veja [[apps]].

Veja também [[settings]].
