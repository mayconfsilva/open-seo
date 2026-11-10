/**
 * Registry of site-audit issue types.
 *
 * Shared between the server (issue engine, MCP tools) and the client
 * (issues UI, CSV export). Each issue row in `audit_issues` references one
 * of these types by id.
 */

// Relative: tests/badseo type-checks this file without the @ alias.
import { RENDERED_CRAWL_TIME_LIMIT_HOURS } from "./audit-limits";

export type IssueSeverity = "critical" | "warning" | "info";

interface AuditIssueDescriptor {
  severity: IssueSeverity;
  title: string;
  explanation: string;
  howToFix: string;
}

export const AUDIT_ISSUE_TYPES = {
  "blocked-page": {
    severity: "critical",
    title: "Crawler bloqueado",
    explanation:
      "O site respondeu com um desafio anti-bot ou um bloqueio de acesso (por exemplo, um desafio do Cloudflare ou um 403) no lugar da página. Informamos isso como é, sem tratar a página como quebrada, mas ela não pôde ser auditada, e outros crawlers, como os de buscadores, podem enfrentar o mesmo atrito.",
    howToFix:
      'Se o site é seu, libere o user agent "OpenSEO-Audit" nas configurações de WAF ou de proteção contra bots (no Cloudflare: uma regra personalizada de WAF que pula a proteção quando o user agent contém "OpenSEO-Audit"; em alguns planos gratuitos pode ser preciso afrouxar a proteção). Depois rode a auditoria de novo. No Shopify, use o acesso de crawler (Loja virtual → Preferências → Acesso de crawler) e cole a assinatura no dataSEO, em Configurações → Acesso de crawler. Como liberar e verificar o crawler: https://openseo.so/docs/crawler',
  },
  "javascript-rendering-suspected": {
    severity: "warning",
    title: "O conteúdo pode depender de JavaScript",
    explanation:
      "O HTML da página tem um contêiner de aplicativo JavaScript com pouquíssimo conteúdo legível e nenhum título, link ou imagem. A página pode carregar o conteúdo no navegador, ou ainda estava carregando quando foi renderizada. As verificações de conteúdo foram puladas porque este HTML pode não representar a página completa.",
    howToFix:
      'Se esta auditoria não renderizou JavaScript, inicie uma nova com "Renderizar JavaScript" ativado para verificar o conteúdo carregado. Para um rastreamento confiável, entregue o conteúdo e a navegação importantes no HTML inicial, com renderização no servidor ou pré-renderização. Este aviso não prova que os buscadores não conseguem indexar a página.',
  },
  "rate-limited-page": {
    severity: "warning",
    title: "Limite de requisições (429)",
    explanation:
      "O servidor respondeu 429 Too Many Requests, então esta página não pôde ser auditada. O crawler esperou o Retry-After do servidor e tentou a página mais uma vez antes de seguir.",
    howToFix:
      'Aumente o limite de requisições para crawlers ou libere o user agent "OpenSEO-Audit" nas regras de limite (no Cloudflare: uma exceção na regra de limite para esse user agent). Depois rode a auditoria de novo. Rodar com menos páginas também ajuda se o limite for rígido. No Shopify, use o acesso de crawler (Loja virtual → Preferências → Acesso de crawler) e cole a assinatura no dataSEO, em Configurações → Acesso de crawler. Como liberar e verificar o crawler: https://openseo.so/docs/crawler',
  },
  "crawl-rate-limited": {
    severity: "warning",
    title: "Rastreamento interrompido: limite de requisições",
    explanation:
      "O site recusou várias páginas seguidas com 429 Too Many Requests, ou deixou o crawler esperando tempo demais, então paramos de pedir páginas. Este relatório está incompleto; as URLs que não buscamos não aparecem como quebradas nem como limitadas.",
    howToFix:
      "Rode a auditoria de novo depois que o limite do site zerar, ou peça ao dono do site para liberar o crawler OpenSEO-Audit (https://openseo.so/docs/crawler). No Shopify, use o acesso de crawler (Loja virtual → Preferências → Acesso de crawler) e cole a assinatura no dataSEO, em Configurações → Acesso de crawler.",
  },
  "crawl-time-limit": {
    severity: "warning",
    title: "Rastreamento interrompido: limite de tempo",
    explanation: `Auditorias que renderizam JavaScript param de rastrear depois de ${RENDERED_CRAWL_TIME_LIMIT_HOURS} horas, e esta chegou a esse limite. Este relatório está incompleto; as URLs que não buscamos não aparecem como quebradas.`,
    howToFix:
      "Rode a auditoria de novo com um limite menor de páginas, ou sem Renderizar JavaScript se o conteúdo e os links do site estão no HTML. A renderização só é cobrada pelas páginas realmente renderizadas.",
  },
  "crawl-credits-exhausted": {
    severity: "warning",
    title: "Rastreamento interrompido: limite de custo atingido",
    explanation:
      "Muitas páginas deste site precisaram do renderizador avançado, então a auditoria chegou ao limite de custo e parou. Só foram cobradas as páginas renderizadas.",
    howToFix:
      "Se o site não precisa de JavaScript para mostrar o conteúdo, rode de novo com Renderizar JavaScript desligado.",
  },
  "server-error": {
    severity: "critical",
    title: "Erro do servidor (5xx)",
    explanation:
      "A página retornou um erro 5xx do servidor. Buscadores que encontram erros de servidor com frequência rastreiam menos o site e podem tirar a página do índice.",
    howToFix:
      "Confira os logs do servidor para esta URL e corrija o erro. Se a página não existe mais, retorne 404/410 ou redirecione para uma página relacionada, em vez de dar erro.",
  },
  "broken-internal-link": {
    severity: "critical",
    title: "Link interno quebrado",
    explanation:
      "Esta página tem um link para uma URL interna que retorna erro (4xx/5xx). Links quebrados desperdiçam orçamento de rastreamento, perdem autoridade e frustram o usuário; estão entre os problemas técnicos de SEO mais comuns e mais prejudiciais.",
    howToFix:
      "Atualize o link para a URL correta que está no ar, ou remova-o. Se o destino mudou de endereço, prefira apontar direto para a URL nova em vez de depender de um redirecionamento.",
  },
  "missing-title": {
    severity: "critical",
    title: "Tag de título ausente",
    explanation:
      "A página não tem <title>. O título é o sinal de relevância mais forte da página e a manchete exibida nos resultados de busca; sem ele, os buscadores criam um por conta própria, quase sempre ruim.",
    howToFix:
      "Adicione um <title> único e descritivo, com cerca de 50 a 60 caracteres, que inclua o assunto principal da página.",
  },
  "broken-page": {
    severity: "warning",
    title: "Página retorna erro (4xx)",
    explanation:
      "Esta URL rastreada retornou um erro do cliente (por exemplo, 404). Se ela aparece no sitemap ou em outras páginas, os crawlers continuam gastando requisições com ela.",
    howToFix:
      "Se a página deveria existir, restaure-a. Se foi removida de propósito, tire-a do sitemap e dos links internos, e considere um redirecionamento 301 para a página mais próxima que está no ar.",
  },
  "duplicate-title": {
    severity: "warning",
    title: "Título duplicado",
    explanation:
      "Várias páginas têm o mesmo título. Os buscadores usam o título para diferenciar páginas; duplicados fazem as páginas competirem entre si e reduzem a taxa de cliques.",
    howToFix:
      "Escreva um título único para cada página, descrevendo o conteúdo específico dela. Em páginas geradas por modelo, inclua o atributo que as diferencia (nome, categoria, local).",
  },
  "duplicate-meta-description": {
    severity: "warning",
    title: "Meta description duplicada",
    explanation:
      "Várias páginas têm a mesma meta description, então os resultados de busca mostram trechos idênticos e o usuário não consegue diferenciar as páginas.",
    howToFix:
      "Escreva uma meta description única por página, ou remova a duplicada; o buscador vai montar um trecho a partir do conteúdo, o que é melhor que um duplicado errado.",
  },
  "duplicate-content": {
    severity: "warning",
    title: "Conteúdo de página duplicado",
    explanation:
      "Duas ou mais URLs mostram exatamente o mesmo texto visível. Os buscadores escolhem uma versão para indexar e ignoram as outras, e os sinais de ranqueamento se dividem entre as duplicadas.",
    howToFix:
      "Consolide as duplicadas: escolha a URL canônica, adicione rel=canonical nas outras e redirecione com 301 as URLs duplicadas quando possível (causas comuns: barra no final, parâmetros de URL, variações http/https ou com e sem www).",
  },
  "missing-meta-description": {
    severity: "warning",
    title: "Meta description ausente",
    explanation:
      "A página não tem meta description. Os buscadores vão montar um trecho a partir do texto da página, que costuma ser menos atraente e reduz a taxa de cliques.",
    howToFix:
      "Adicione uma meta description de cerca de 70 a 160 caracteres que resuma a página e dê um motivo para clicar.",
  },
  "missing-h1": {
    severity: "warning",
    title: "Título H1 ausente",
    explanation:
      "A página não tem H1. O H1 diz ao usuário e aos buscadores do que a página trata; páginas sem ele costumam ter um assunto menos claro.",
    howToFix:
      "Adicione um único H1 com o assunto principal da página, coerente com a tag de título.",
  },
  "multiple-h1": {
    severity: "warning",
    title: "Vários títulos H1",
    explanation:
      "A página tem mais de um H1, o que dilui o sinal do assunto principal e costuma indicar um erro de modelo (por exemplo, o logo e a manchete marcados como H1).",
    howToFix:
      "Mantenha um H1 para o título principal e rebaixe os outros para H2/H3 (ou elementos sem estilo de título, no caso de logos).",
  },
  "redirect-chain": {
    severity: "warning",
    title: "Cadeia de redirecionamentos",
    explanation:
      "Chegar à página final exige dois ou mais redirecionamentos seguidos. Cada salto aumenta o tempo de carregamento, perde autoridade e consome orçamento de rastreamento; cadeias longas podem nem ser seguidas.",
    howToFix:
      "Aponte a primeira URL (e os links internos) direto para o destino final, para que haja no máximo um redirecionamento.",
  },
  "redirect-loop": {
    severity: "warning",
    title: "Redirecionamento em loop",
    explanation:
      "Este redirecionamento acaba voltando para si mesmo, então a URL nunca carrega. Navegadores e crawlers desistem com erro.",
    howToFix:
      "Revise as regras de redirecionamento desta URL e quebre o ciclo, para que a cadeia termine numa página 200 de verdade.",
  },
  "canonical-conflict": {
    severity: "warning",
    title: "Sinais de canonical conflitantes",
    explanation:
      "A página declara URLs canônicas diferentes no <link rel=canonical> do HTML e no cabeçalho HTTP Link. Quando os sinais conflitam, os buscadores ignoram os dois e escolhem a canônica por conta própria.",
    howToFix:
      "Escolha uma URL canônica e declare em um só lugar (o mais comum é o head do HTML); remova ou alinhe a outra declaração.",
  },
  "thin-content": {
    severity: "warning",
    title: "Conteúdo raso",
    explanation:
      "A página tem muito pouco texto visível. Páginas rasas raramente ranqueiam, podem puxar para baixo a avaliação de qualidade do site inteiro e, se o site renderiza no navegador, podem indicar conteúdo invisível para crawlers que leem só o HTML.",
    howToFix:
      "Amplie a página com conteúdo realmente útil, marque como noindex ou junte com uma página mais forte. Se o conteúdo existe mas é renderizado por JavaScript, garanta que ele venha renderizado do servidor ou pré-renderizado.",
  },
  "images-missing-alt": {
    severity: "warning",
    title: "Imagens sem texto alternativo",
    explanation:
      "Uma ou mais imagens da página não têm atributo alt. O texto alternativo é um requisito de acessibilidade e a principal forma de os buscadores entenderem imagens.",
    howToFix:
      'Adicione um texto alternativo descritivo às imagens com significado; use alt vazio (alt="") só nas puramente decorativas.',
  },
  "orphan-page": {
    severity: "warning",
    title: "Página órfã",
    explanation:
      "Nenhuma página rastreada tem link para esta URL; ela só foi encontrada pelo sitemap. Páginas sem links internos recebem pouca atenção dos crawlers, nenhuma autoridade interna, e o usuário não chega a elas navegando.",
    howToFix:
      "Coloque links para esta página a partir de páginas relacionadas (navegação, conteúdo relacionado, páginas centrais), ou tire-a do sitemap se ela não deve ser indexada.",
  },
  "no-outgoing-links": {
    severity: "warning",
    title: "Página sem links de saída",
    explanation:
      "A página não tem nenhum link: é um beco sem saída. A autoridade que chega nela para ali, os crawlers não têm para onde seguir e o usuário precisa voltar pelo navegador.",
    howToFix:
      "Adicione links para páginas relacionadas, para a categoria acima ou para a página inicial. Se a navegação da página é renderizada por JavaScript, garanta que ela também exista no HTML vindo do servidor.",
  },
  "title-too-long": {
    severity: "info",
    title: "Título longo demais",
    explanation:
      "O título passa de ~60 caracteres, então os resultados de busca vão cortá-lo e o final pode sumir no meio da frase.",
    howToFix:
      "Encurte o título para cerca de 50 a 60 caracteres, com as palavras mais importantes no começo.",
  },
  "title-too-short": {
    severity: "info",
    title: "Título curto demais",
    explanation:
      "O título tem menos de ~10 caracteres, o que geralmente é genérico demais para descrever a página ou atrair cliques.",
    howToFix:
      "Transforme o título numa frase descritiva (cerca de 30 a 60 caracteres) que diga o que a página oferece.",
  },
  "meta-description-too-long": {
    severity: "info",
    title: "Meta description longa demais",
    explanation:
      "A meta description passa de ~160 caracteres, então os buscadores vão cortar o trecho.",
    howToFix:
      "Reduza a descrição para cerca de 70 a 160 caracteres, mantendo a mensagem principal e a chamada para ação.",
  },
  "meta-description-too-short": {
    severity: "info",
    title: "Meta description curta demais",
    explanation:
      "A meta description tem menos de ~70 caracteres. Descrições curtas desperdiçam o espaço do trecho nos resultados, e os buscadores costumam ignorá-las e usar um texto tirado da página.",
    howToFix:
      "Amplie a descrição para cerca de 70 a 160 caracteres que resumam a página e deem um motivo para clicar.",
  },
  "heading-order-skip": {
    severity: "info",
    title: "Níveis de título pulados",
    explanation:
      "A hierarquia de títulos pula níveis (por exemplo, um H4 logo depois de um H2). Isso enfraquece a estrutura do documento para ferramentas de acessibilidade e leitura de conteúdo.",
    howToFix:
      "Ajuste os níveis para descerem um passo de cada vez (H1 → H2 → H3), sem pular.",
  },
  "slow-response": {
    severity: "info",
    title: "Resposta lenta do servidor",
    explanation:
      "A resposta HTML levou mais de 1,5 segundo. Um tempo até o primeiro byte lento puxa para baixo todas as métricas de desempenho e reduz o ritmo de rastreamento em sites grandes.",
    howToFix:
      "Investigue o tempo de servidor e banco de dados e o cache desta rota; servir HTML em cache ou gerado estaticamente costuma resolver.",
  },
  "noindex-page": {
    severity: "info",
    title: "Página com noindex",
    explanation:
      "A página pede para não ser indexada (pela meta tag robots ou pelo cabeçalho X-Robots-Tag). Isso costuma ser proposital; é um aviso, não um erro.",
    howToFix:
      "Se esta página deveria ranquear, remova a diretiva noindex. Se é proposital (páginas de admin, de agradecimento ou de filtros), não precisa fazer nada.",
  },
  "canonicalized-page": {
    severity: "info",
    title: "Canonical aponta para outra URL",
    explanation:
      "A página declara outra URL como canônica, pedindo aos buscadores que indexem aquela URL no lugar desta. Tudo bem quando é proposital (páginas com parâmetros, conteúdo republicado); é um problema se esta página deveria ranquear.",
    howToFix:
      "Se esta página deve ranquear sozinha, aponte o canonical para ela mesma. Se não, não precisa fazer nada.",
  },
  "deep-page": {
    severity: "info",
    title: "Página muito profunda na estrutura",
    explanation:
      "A página está a 5 ou mais cliques da página inicial. Páginas profundas são rastreadas com menos frequência e recebem menos autoridade.",
    howToFix:
      "Adicione links a partir de páginas de nível mais alto (páginas centrais, categorias, navegação) para encurtar o caminho até esta página.",
  },
} as const satisfies Record<string, AuditIssueDescriptor>;

export type AuditIssueType = keyof typeof AUDIT_ISSUE_TYPES;

export const ISSUE_SEVERITY_ORDER: Record<IssueSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const issueRegistry: Record<string, AuditIssueDescriptor> = AUDIT_ISSUE_TYPES;

export function getIssueDescriptor(
  issueType: string,
): AuditIssueDescriptor | null {
  return issueRegistry[issueType] ?? null;
}
