<!-- source: 9d4c677df24e -->
# Apps

Como encontrar, adicionar, atualizar e remover apps. Apps são as coisas que você realmente usa: o Roleplay é o principal.

## A página inicial

Uma nova aba (+) abre a página inicial, "Para onde?". Ela lista o Molfar e seus apps instalados. No computador, clique em um app para ver o que há dentro e pressione "Abrir"; os detalhes também têm "Exportar app" e, para apps que possuem uma fonte de atualização, "Verificar atualizações". No celular, um toque abre na hora e o botão (i) mostra os detalhes. O ícone de lixeira exclui um app após perguntar, e isso remove os dados dele permanentemente.

Cada app aberto tem sua própria aba. As abas podem ser arrastadas para qualquer ordem e voltam após uma atualização da página.

## Com um app aberto

A barra de ferramentas oferece:

- "Dividir": Molfar à esquerda, o app ao vivo à direita.
- "Tela cheia": o app em sua própria aba do navegador, que você pode instalar como um app.
- "Plugins": os plugins do app e suas permissões; importe mais do git.
- "Recompilar": recompila o app agora mesmo. Enquanto uma compilação roda, o botão vira "Compilando…" com um relógio (por exemplo 1:23) e não pode ser pressionado de novo; acima do app aparece uma linha fina dizendo o que está sendo compilado ("Empacotando os pacotes…" ou "Compilando o código do app…"), com o mesmo relógio. A primeira compilação pode levar alguns minutos, mais no celular: mantenha a página aberta.

No celular, esses três ficam no menu da conta, e a entrada "Recompilar" mostra o mesmo relógio "Compilando…".

Depois de atualizar um app, ele é compilado de novo na próxima vez que você o abrir, mas só os arquivos que mudaram (e os pacotes só se mudaram), então costuma ser rápido. Configurações > Desenvolvedor lista cada app com sua compilação: "Compilado e atualizado", "Compilado antes. Recompila quando você o abre", "Ainda não compilado. Compila quando você o abre", "Falha na compilação" ou "Compilando…" com o relógio enquanto uma roda.

## Quando um app quer ler outro app

Um app pode pedir para ler arquivos de outro app, por exemplo o Social lendo seus personagens do Roleplay. Na primeira vez que você abre um app assim, aparece uma pergunta: "Permitir que <app> leia seus dados de <other app>?", com para que serve e os arquivos exatos. "Permitir" ou "Não permitir" são respostas; "Decidir depois" pergunta de novo na próxima vez. É somente leitura: o app não pode mudar nem apagar nada no outro app, e vê apenas os arquivos listados. Você pode mudar sua resposta a qualquer momento: na página inicial, abra os detalhes do app e veja em "Acesso a outros apps". Se uma atualização do app pedir mais arquivos, você será perguntado de novo. Remover qualquer um dos dois apps esquece a resposta.

## Mensagens dos apps

Um app oficial, como o Social, pode avisar o Molfar Vertep de que algo está esperando por você. Um número pequeno aparece na aba do app e, quando algo novo chega, você vê uma mensagem curta: um pop-up no canto inferior direito enquanto você está no Molfar Vertep olhando outra coisa, ou uma notificação do sistema quando a janela não está em primeiro plano (o navegador pede permissão uma vez; a chave das notificações do sistema fica nas Configurações). Nada é mostrado enquanto você olha o próprio app. Para desligar isso em um app, abra os detalhes dele na página inicial e desmarque "Notificações deste aplicativo"; o número também some. Clicar no pop-up abre o app.

## A Store

"Store" na página inicial lista apps do Molfar Vertep (marcados como "App oficial") e da comunidade. Pressione "Instalar": primeiro você vê o que o app inclui e o que ele pode acessar, e nada roda até você confirmar. Instale apenas o que você confia, porque apps executam código de verdade no seu computador. "Atualizar" pede novos apps, e um contador mostra os adicionados desde a última vez que você olhou.

## Apps novos e importados

- "Novo app": dê um nome (o autor é opcional) e você recebe um app inicial que o Molfar desenvolve com você.
- "Importar app": de um repositório git ou de um arquivo de backup feito por "Exportar app". Ele é inspecionado primeiro, e nada roda até você ler o que ele inclui e confirmar.

## Atualizações

O ícone de download na barra superior ganha um ponto quando algo está esperando. Ele lista todos os apps e tem "Verificar agora". Um app sem fonte de atualização mostra "Sem fonte de atualização" e um motivo curto. Um app instalado a partir de um arquivo (um zip) não pode ser atualizado aqui: para receber atualizações, instale-o pela Store; essa cópia é um app separado, então exporte antes o arquivo se ele tiver dados que você quer manter (o ícone de lixeira exclui o app e os dados dele). Um app criado neste dispositivo (pelo Molfar, por exemplo) ou copiado à mão não tem de onde se atualizar. Instalar um app cujo intervalo `engine` nomeia um contrato de app que este motor não tem (um número de versão do Molfar Vertep escrito ali por engano conta) é recusado com uma mensagem que diz isso; a linha do motor na janela de atualizações nomeia os apps instalados que já não servem. "Atualizar tudo" aparece quando dois ou mais apps esperam, e nunca inclui o próprio Molfar Vertep.

Suas próprias edições são mescladas em uma atualização, e seus dados são mantidos. Onde suas edições se sobrepõem à nova versão, nada muda ainda: você escolhe "Manter a minha", "Aceitar atualização" ou "Pedir ao Molfar para mesclar". Uma atualização que instala novos pacotes ou pede novas permissões espera seu OK.

## Onde ficam as configurações do app

As configurações de um app ficam dentro do app. As Configurações do shell guardam o que todos os apps compartilham: modelos, voz, imagens, memória, servidores MCP. Veja [[settings]].

## Se um app falhar

Quando a compilação de um app falha, ele mantém a última versão boa, e a barra de erro oferece "Perguntar ao Molfar", que envia o problema para ele em um novo chat. Veja [[help-and-bugs]].
