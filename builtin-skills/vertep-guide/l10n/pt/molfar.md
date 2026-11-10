<!-- source: 6b5436de93e1 -->
# Molfar, seu agente

O Molfar é o agente de IA integrado ao Molfar Vertep. Tudo aqui são arquivos comuns, e ele edita esses arquivos para você. Leia esta página se quiser mudar algo nos seus apps e não quiser fazer à mão.

## Onde ele vive

Abra a linha "Molfar" na página inicial. Ele ganha sua própria aba, a página do agente. Escreva na caixa e pressione Enter para enviar (no celular, Enter faz uma nova linha e o botão de seta envia). Digite `/` para comandos e modelos, ou `@` para nomear um arquivo, personagem, lorebook ou preset para que ele olhe exatamente aquele.

Com um app aberto, "Dividir" coloca o Molfar à esquerda e o app ao vivo à direita, para você vê-lo mudar enquanto pergunta. No celular, ele é apenas outra aba.

## O que ele pode fazer

- Mudar um app: telas, comportamento, cores, layout.
- Criar um novo app a partir de um inicial e depois desenvolvê-lo com você.
- Editar dados dentro dos apps, por exemplo cartões de personagem e lorebooks, mesmo os muito grandes.
- Adicionar plugins e mudar temas.
- Gerar imagens com os modelos de imagem que você configurou.
- Manter notas e propor entradas de memória e habilidades.
- Se você for o administrador, ajudar com contas e configurações do servidor. Cada mudança assim espera sua aprovação.

Ele olha antes de mudar, trabalha em pequenos passos, confere o trabalho e termina com um relatório curto do que mudou e como desfazer.

## O que ele pergunta primeiro

- **Pedidos grandes ou pouco claros.** Para um app novo ou um recurso grande, ele faz algumas perguntas com opções primeiro.
- **Arquivos protegidos.** Por padrão, os arquivos de código de um app e a página principal dele são protegidos, assim como as instruções permanentes dele e o arquivo de parâmetros do modelo. Um cartão pergunta "Permitir" ou "Não permitir", e a resposta vale só para aquele pedido. Você edita a lista em Configurações, Molfar.
- **Custo.** Antes de uma tarefa grande, de uma geração de teste paga ou de uma imagem paga, ele mostra uma estimativa e espera seu sim. Mude isso em Configurações, Molfar, Verificações de custo.
- **Comandos do shell.** Dependendo do modo, abaixo.

## Modo

O seletor de modo no cabeçalho decide o que ele pode fazer sem perguntar:

- **Completo** planeja mudanças grandes primeiro, depois edita e roda comandos.
- **Aceitar** pula a etapa de planejamento e pergunta antes de cada comando do shell.
- **Planejar** apenas lê e planeja, e não muda nada. Depois de um plano, "Aplicar proposta" sai do modo e o executa.

## Como desfazer

Abaixo de uma resposta que mudou um app, você vê "Alterado <app> · N arquivos · Desfazer". Desfazer pergunta primeiro e depois devolve o código do app ao que era antes daquela execução. Seus chats e uploads ficam. A página do projeto de um app também tem Pontos de verificação: pontos salvos do código do app que o Molfar tira antes de mudar o app. Você pode adicionar os seus com "Salvar ponto de verificação", e Restaurar pergunta primeiro. Cada restauração também é salva, então pode ser desfeita.

## Memória e habilidades

O botão de cérebro abre "Memória e habilidades". A memória guarda o que ele mantém entre os chats; ele propõe entradas e salva uma apenas quando você concorda. As habilidades são instruções curtas para um tipo de trabalho; "Nova habilidade" escreve uma e "Melhorar com o Molfar" a refina. Veja [[projects-and-chats]] para as específicas de cada projeto.

### A caixa de entrada

Um cartão que propõe uma entrada de memória ou uma habilidade tem três respostas: "Save", "Later" e "Skip". "Later" deixa a proposta na aba "Mailbox" de "Memória e habilidades", e o mesmo vale para um cartão que ninguém respondeu e para uma sugestão que o Molfar faz depois de uma tarefa longa. Um número no botão de cérebro mostra quantas esperam; quando algo espera, o botão abre na aba "Mailbox".

- Uma entrada de memória pode ser editada antes de salvar. Uma habilidade é mostrada inteira, ou como diff quando altera uma habilidade que você já tem, e é salva como é mostrada. Para mudá-la, pule-a e diga ao Molfar o que corrigir.
- "Skip" é lembrado, então o Molfar não traz a mesma proposta de volta. "Skip all" esvazia a lista.
- Um chat que terminou enquanto você estava em outro chat também espera na aba "Mailbox", com "Open" e "Dismiss". A lista de chats o marca da mesma forma.

## Bom saber

- Modelos pequenos ou gratuitos: o "Modo de modelo pequeno" em Configurações, Molfar envia um prompt mais curto.
- O botão de olho, o inspetor de prompt, mostra o que o modelo realmente recebeu.
- Chats longos podem ser dobrados em um resumo com "Compactar conversa" ou `/compact`.
- As palavras usadas aqui são explicadas no [[glossary]].
