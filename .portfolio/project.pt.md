---
description: >-
  Um portfólio de engenharia de software inspirado em terminais, com estudos de
  caso localizados, avaliação de compatibilidade com vagas e agendamento de
  reuniões de uma hora.
metaDescription: >-
  Portfólio de engenharia de software de Henrique Krause com estudos de caso
  localizados, avaliação de compatibilidade com vagas e agendamento de reuniões
  de uma hora pelo Google Calendar e Google Meet.
summary: >-
  Este portfólio apresenta projetos de software selecionados como estudos de
  caso localizados e indexáveis. Visitantes podem comparar uma vaga com a
  experiência publicada e agendar uma conversa de uma hora.
highlights:
  - Estudos de caso localizados e indexáveis
  - Registros de projetos opt-in pelo GitHub
  - Snapshots validados durante o build
  - Avaliação de compatibilidade com vagas
  - Agendamento de uma hora pelo Google Calendar e Meet
  - Detecção de bots e limites compartilhados para ações públicas
  - Agendamento de calendário seguro contra repetição
  - Validação antecipada da configuração de produção
  - Ambiente de desenvolvimento local com Docker
  - Metadados de SEO e dados estruturados
---

## Produto

Este portfólio reúne perfil profissional, links de contato e projetos de software selecionados em uma interface compacta.

As páginas dos projetos são indexáveis e incluem metadados localizados, dados estruturados, entradas no sitemap e prévias para redes sociais.

## O que construí

Repositórios públicos da conta configurada no GitHub participam por meio de um arquivo `.portfolio/project.json`. A sincronização valida os registros elegíveis e suas traduções em um snapshot gerado durante o build.

A rota de avaliação usa os registros publicados dos projetos como contexto, retorna uma análise curta em texto simples e não armazena nem a descrição enviada nem a resposta.

O agendamento recebe nome, e-mail, horário local em hora cheia e fuso horário. Ele consulta a disponibilidade no Google Calendar, cria um evento privado de uma hora com uma solicitação de conferência no Google Meet, envia o convite e pode enviar ao proprietário uma notificação idempotente de melhor esforço pelo Resend.

## Decisões de engenharia

Os Client Components ficam restritos aos formulários interativos, enquanto Route Handlers em Node.js validam as entradas antes de solicitações externas.

BotID, sessões assinadas canônicas, limites de tamanho para requisições e limites por sessão e por IP agregado no Redis protegem as ações públicas. Em produção, o sistema bloqueia as operações quando o armazenamento compartilhado de proteção está indisponível.

O agendamento usa locks no Redis derivados de limites definidos para solicitações externas, uma chave de idempotência estável no navegador, IDs determinísticos no Calendar e resumos privados da requisição e da operação. Links existentes só são reutilizados na operação original, enquanto eventos cancelados são restaurados como novos agendamentos.

Os builds de produção validam variáveis críticas, robustez dos segredos, URLs e grupos opcionais de configuração antes da compilação. O desenvolvimento local usa um lockfile exato e um serviço Redis no Docker Compose pelo mesmo adaptador da aplicação.

O layout responsivo funciona em desktops e telas móveis estreitas, com foco de teclado visível, safe areas e temas claro e escuro do sistema.
