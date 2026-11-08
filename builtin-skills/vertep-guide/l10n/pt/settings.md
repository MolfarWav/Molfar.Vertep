<!-- source: 51d046c99c83 -->
# Mapa de Configurações

Configurações é a caixa de diálogo do próprio shell, compartilhada por todos os apps. Abra com a engrenagem na barra superior, ou no celular pelo menu da conta no canto superior direito. Esta página lista cada seção para você saber onde procurar.

## Seções

- **Geral.** O idioma da interface, o bloco "Guia" (desligar os tours, mostrá-los de novo, mostrar as Novidades de novo) e sua conta: imagem, nome, senha, "Sair".
- **Cópia de segurança.** Exporte todo o seu perfil para mudar para outro computador e importe um. Veja [[devices]].
- **Armazenamento.** As imagens que seus cartões, chats e sprites usam. "Encontrar imagens não usadas" localiza as que nada usa e as move para a lixeira; "Esvaziar a lixeira" as remove para sempre, após perguntar.
- **Sincronização.** Leve seus jogos entre dispositivos com o Google Drive ou uma pasta. Veja [[devices]].
- **Conexões e modelos.** Provedores, a lista de modelos, favoritos, configurações por modelo, o modelo de visão. Veja [[models]].
- **Voz.** Texto em fala: vozes do Edge e seus próprios endpoints de voz.
- **Imagens.** Geração de imagens: modelos de imagem e servidores de imagem.
- **Molfar.** Como o Molfar se comporta em todos os apps:
  - o acesso à internet dele no sandbox;
  - "Compactar sessões longas automaticamente";
  - "Modo de modelo pequeno";
  - "Verificações de custo": Auto, Sempre perguntar ou Nunca perguntar;
  - "Notificações" quando ele pergunta algo, termina ou falha;
  - "Instruções do Molfar", suas preferências permanentes para ele;
  - a lista de arquivos protegidos.
  Veja [[molfar]].
- **Memória.** Como os apps lembram e encontram coisas entre os chats. Ela pode combinar por significado, não apenas por palavras exatas, com um único modelo de embeddings barato. Isto é opcional. Por padrão, o Molfar Vertep escolhe o modelo sozinho: primeiro um que roda no seu próprio computador (LM Studio, Ollama, sem chave necessária), depois uma conexão de API com chave e, por fim, o OpenRouter. Se nenhum estiver configurado, a memória avisa e combina apenas por palavras. Você também pode baixar um modelo para o seu próprio computador com um clique: em **Neste computador (opcional)** escolha **bge-m3** (recomendado, o melhor em ucraniano, russo e inglês) ou **EmbeddingGemma 2** (menor) e pressione **Baixar e conectar**. O motor primeiro instala o programa que roda o modelo (cerca de 85 MB, uma vez), depois baixa o modelo (587 MB ou 346 MB) e o conecta. O download continua se você fechar a janela, e um download interrompido prossegue de onde parou. Depois disso, é grátis, nada vai para a internet, e o modelo ocupa memória (cerca de 1,1 GB ou 0,6 GB) só enquanto trabalha. **Excluir** devolve o espaço do disco. Ele precisa de um computador que roda o motor com Bun, não de um launcher de celular; a conexão online continua como reserva, e se você trocar de modelo, a memória refaz os seus vetores sozinha.
- **Servidores MCP.** Servidores de ferramentas que o Molfar e seus apps podem chamar. Os apps começam com cada um desligado e ligam o que precisam.
- **Desenvolvedor.** Mostra o estado de compilação de cada app e a recarga em tempo real, que está sempre ativa.

## Somente para o administrador

- **Servidor.** Como o Molfar Vertep roda neste computador: porta, abrir o navegador ao iniciar, permitir outros dispositivos na sua rede (com um código QR para o celular), HTTPS, se os apps podem baixar pacotes, a versão e como atualizar.
- **Usuários.** Pessoas que podem entrar. Cada uma recebe seu próprio espaço de trabalho, agente e apps.

## O que não está aqui

Não há seção para apps individuais. As configurações de um app ficam dentro do app. Veja [[apps]].

> No celular, Configurações mostra primeiro uma lista de seções; toque em uma para entrar e use Voltar para retornar.
