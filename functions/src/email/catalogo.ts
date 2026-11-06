/* ------------------------------------------------------------------ *
 * Catálogo de TODOS os e-mails do Tá no Caixa, num lugar só.
 *
 * Cada e-mail tem texto com variáveis {{{ASSIM}}}. O mesmo texto serve
 * pra três coisas:
 *   - template no Resend (alias `tnc-<id>`), editável no painel;
 *   - e-mail montado no código (reserva, se o template falhar);
 *   - e-mail de teste (com os `exemplo` de cada variável).
 * As variáveis são sempre texto puro: o código nunca injeta HTML nelas.
 * ------------------------------------------------------------------ */
import { comUtm, montarHtml, URL_SITE, type Bloco, type ConteudoEmail } from './layout'

export type TipoEmail = 'transacional' | 'uso' | 'novidades'
/** Tópico de descadastro de cada e-mail que não é transacional. */
export type Topico = 'dicas' | 'recado' | 'novidades'

export interface DefEmail {
  id: string
  tipo: TipoEmail
  topico?: Topico
  /** Pra quem vai (aparece no assunto dos e-mails de teste). */
  segmento: string
  assunto: string
  previa: string
  rotulo?: string
  titulo: string
  blocos: Bloco[]
  motivo: string
  /** Variáveis usadas e um valor de exemplo pra cada uma. */
  variaveis: Record<string, string>
}

const l = (caminho: string, id: string) => comUtm(`${URL_SITE}${caminho}`, `tnc-${id}`, 'botao')
const PRECO = 'O plano é R$ 149 por loja/mês, no cartão. Cancela quando quiser, sem multa.'
const M_DONO_TESTE = 'Você recebe este aviso porque é dono de uma loja no Tá no Caixa em período de teste.'
const M_ASSINATURA = 'Você recebe este e-mail porque é dono de uma loja com assinatura no Tá no Caixa.'
const M_ACESSO = 'Você recebe este e-mail porque ele foi pedido na sua conta do Tá no Caixa. Se não foi você, ignore.'
const M_USO = 'Você recebe este e-mail porque usa o Tá no Caixa na {{{LOJA}}}.'
const OI = { OI: 'Oi, Maria!' }
const LOJA = { LOJA: 'Fausto Burger Realengo' }

/** Atalho para e-mails de uso (dicas por papel). */
function uso(
  id: string,
  segmento: string,
  assunto: string,
  previa: string,
  titulo: string,
  blocos: Bloco[],
  extra: Record<string, string> = {},
): DefEmail {
  return { id, tipo: 'uso', topico: 'dicas', segmento, assunto, previa, rotulo: 'Dica', titulo, blocos, motivo: M_USO, variaveis: { ...OI, ...LOJA, ...extra } }
}

export const CATALOGO: DefEmail[] = [
  /* ----------------------------- Acesso ----------------------------- */
  {
    id: 'acesso-verificacao', tipo: 'transacional', segmento: 'Transacional · Quem criou conta com senha',
    assunto: 'Confirme seu e-mail no Tá no Caixa', previa: 'Um clique e pronto.', rotulo: 'Sua conta',
    titulo: 'Confirme seu e-mail',
    blocos: [
      { p: '{{{OI}}} Falta só confirmar que este e-mail é seu.' },
      { botao: { texto: 'Confirmar e-mail', url: '{{{LINK}}}' } },
      { nota: 'O link vale por pouco tempo. Se ele vencer, peça outro na tela de entrar.' },
    ],
    motivo: M_ACESSO, variaveis: { ...OI, LINK: `${URL_SITE}/conta/acao?mode=verifyEmail&oobCode=EXEMPLO` },
  },
  {
    id: 'acesso-senha', tipo: 'transacional', segmento: 'Transacional · Quem pediu nova senha',
    assunto: 'Sua nova senha do Tá no Caixa', previa: 'Crie a nova senha pelo botão.', rotulo: 'Sua conta',
    titulo: 'Crie uma nova senha',
    blocos: [
      { p: '{{{OI}}} Recebemos um pedido para trocar a senha da conta {{{EMAIL_CONTA}}}.' },
      { botao: { texto: 'Criar nova senha', url: '{{{LINK}}}' } },
      { nota: 'Se não foi você, ignore este e-mail. Sua senha continua a mesma.' },
    ],
    motivo: M_ACESSO, variaveis: { ...OI, EMAIL_CONTA: 'maria@exemplo.com', LINK: `${URL_SITE}/conta/acao?mode=resetPassword&oobCode=EXEMPLO` },
  },
  {
    id: 'acesso-troca-email', tipo: 'transacional', segmento: 'Transacional · Quem trocou o e-mail de login',
    assunto: 'Confirme seu novo e-mail no Tá no Caixa', previa: 'Confirme para passar a entrar com ele.', rotulo: 'Sua conta',
    titulo: 'Confirme seu novo e-mail',
    blocos: [
      { p: '{{{OI}}} Você pediu para entrar no Tá no Caixa com o e-mail {{{EMAIL_NOVO}}}. Confirme pelo botão.' },
      { botao: { texto: 'Confirmar novo e-mail', url: '{{{LINK}}}' } },
      { nota: 'Até confirmar, você continua entrando com o e-mail de antes.' },
    ],
    motivo: M_ACESSO, variaveis: { ...OI, EMAIL_NOVO: 'maria.nova@exemplo.com', LINK: `${URL_SITE}/conta/acao?mode=verifyAndChangeEmail&oobCode=EXEMPLO` },
  },

  /* ----------------------------- Convites --------------------------- */
  {
    id: 'convite', tipo: 'transacional', segmento: 'Transacional · Convidado para a equipe',
    assunto: '{{{QUEM}}} chamou você para a {{{LOJA}}} no Tá no Caixa', previa: 'Aceite o convite e entre na equipe.', rotulo: 'Convite',
    titulo: 'Você foi chamado para a {{{LOJA}}}',
    blocos: [
      { p: '{{{QUEM}}} chamou você para entrar na equipe da {{{LOJA}}} no Tá no Caixa, como {{{PAPEL}}}.' },
      { p: '{{{O_QUE_FAZ}}}' },
      { botao: { texto: 'Aceitar convite', url: '{{{LINK}}}' } },
      { nota: 'Ainda não tem conta? Ela é criada na hora, com este e-mail.' },
    ],
    motivo: 'Você recebe este e-mail porque alguém da {{{LOJA}}} convidou este endereço.',
    variaveis: { QUEM: 'Fernando', ...LOJA, PAPEL: 'Caixa', O_QUE_FAZ: 'No Tá no Caixa você abre, fecha e confere o caixa da loja.', LINK: `${URL_SITE}/convite/EXEMPLO` },
  },
  {
    id: 'convite-lembrete', tipo: 'transacional', segmento: 'Transacional · Convidado que não aceitou em 3 dias',
    assunto: 'Seu convite para a {{{LOJA}}} ainda está esperando', previa: 'É só aceitar pelo botão.', rotulo: 'Convite',
    titulo: 'Seu convite ainda está esperando',
    blocos: [
      { p: '{{{QUEM}}} chamou você para a equipe da {{{LOJA}}} como {{{PAPEL}}}, e o convite ainda não foi aceito.' },
      { botao: { texto: 'Aceitar convite', url: '{{{LINK}}}' } },
      { nota: 'Este é o único lembrete.' },
    ],
    motivo: 'Você recebe este e-mail porque alguém da {{{LOJA}}} convidou este endereço.',
    variaveis: { QUEM: 'Fernando', ...LOJA, PAPEL: 'Caixa', LINK: `${URL_SITE}/convite/EXEMPLO` },
  },
  {
    id: 'convite-aceito', tipo: 'transacional', segmento: 'Transacional · Quem convidou',
    assunto: '{{{NOVO}}} entrou na {{{LOJA}}} como {{{PAPEL}}}', previa: 'Sua equipe cresceu.', rotulo: 'Equipe',
    titulo: '{{{NOVO}}} entrou na equipe',
    blocos: [
      { p: '{{{OI}}} {{{NOVO}}} aceitou o convite e já está na {{{LOJA}}} como {{{PAPEL}}}.' },
      { botao: { texto: 'Ver a equipe', url: l('/painel/ajustes', 'convite-aceito') } },
      { nota: 'Precisa mudar o papel ou tirar alguém? É em Ajustes › Equipe.' },
    ],
    motivo: 'Você recebe este e-mail porque convidou alguém para a {{{LOJA}}}.',
    variaveis: { ...OI, NOVO: 'João', ...LOJA, PAPEL: 'Caixa' },
  },

  /* -------------------------- Fim do teste -------------------------- */
  {
    id: 'teste-d7', tipo: 'transacional', segmento: 'TNC · Donos em teste (D-7)',
    assunto: 'Seu teste do Tá no Caixa vai até {{{DATA_FIM}}}', previa: 'Um aviso com antecedência, sem pressa.', rotulo: 'Teste grátis',
    titulo: '{{{NOME_VIRGULA}}}seu teste vai até {{{DATA_FIM}}}',
    blocos: [
      { p: 'Só um aviso com antecedência: o período de teste {{{LOJA_DA}}} termina em {{{DATA_FIM}}}, às 23:59.' },
      { p: '{{{USO}}}' },
      { p: PRECO },
      { botao: { texto: 'Assinar plano', url: '{{{LINK}}}' } },
    ],
    motivo: M_DONO_TESTE,
    variaveis: { NOME_VIRGULA: 'Maria, ', DATA_FIM: '25 de novembro', LOJA_DA: 'da Fausto Burger Realengo', USO: 'Até agora: 12 dias lançados na Fausto Burger Realengo.', LINK: `${URL_SITE}/painel/assinatura?assinar=1&loja=EXEMPLO` },
  },
  {
    id: 'teste-d2', tipo: 'transacional', segmento: 'TNC · Donos em teste (D-2)',
    assunto: 'Faltam 2 dias para o fim do teste', previa: 'Seus números ficam guardados. Para seguir lançando, é só assinar.', rotulo: 'Teste grátis',
    titulo: 'Faltam 2 dias para o fim do teste',
    blocos: [
      { p: '{{{NOME_VIRGULA}}}o teste {{{LOJA_DA}}} acaba em {{{DATA_FIM}}}, às 23:59. Tudo o que você lançou fica guardado.' },
      { p: 'Para continuar lançando e vendo seus números depois disso, é só assinar.' },
      { botao: { texto: 'Assinar plano', url: '{{{LINK}}}' } },
      { nota: PRECO },
    ],
    motivo: M_DONO_TESTE,
    variaveis: { NOME_VIRGULA: 'Maria, ', DATA_FIM: '25 de novembro', LOJA_DA: 'da Fausto Burger Realengo', LINK: `${URL_SITE}/painel/assinatura?assinar=1&loja=EXEMPLO` },
  },
  {
    id: 'teste-d0', tipo: 'transacional', segmento: 'TNC · Donos em teste (último dia)',
    assunto: 'Hoje é o último dia do teste', previa: 'O teste acaba hoje às 23:59.', rotulo: 'Teste grátis',
    titulo: 'Hoje é o último dia do teste',
    blocos: [
      { p: '{{{NOME_VIRGULA}}}o teste {{{LOJA_DA}}} acaba hoje às 23:59. Assinando agora, nada para.' },
      { botao: { texto: 'Assinar plano', url: '{{{LINK}}}' } },
      { nota: PRECO },
    ],
    motivo: M_DONO_TESTE,
    variaveis: { NOME_VIRGULA: 'Maria, ', LOJA_DA: 'da Fausto Burger Realengo', LINK: `${URL_SITE}/painel/assinatura?assinar=1&loja=EXEMPLO` },
  },
  {
    id: 'teste-d1', tipo: 'transacional', segmento: 'TNC · Donos sem assinatura (D+1)',
    assunto: 'Seus números continuam aqui', previa: 'O teste acabou e nada foi apagado.', rotulo: 'Teste grátis',
    titulo: 'Seus números continuam aqui',
    blocos: [
      { p: '{{{NOME_VIRGULA}}}o teste {{{LOJA_DA}}} terminou ontem. Nada foi apagado: vendas, despesas e estoque estão do jeito que você deixou.' },
      { p: 'Assinando, você volta de onde parou.' },
      { botao: { texto: 'Assinar plano', url: '{{{LINK}}}' } },
      { nota: `${PRECO} Este é o último aviso sobre o teste.` },
    ],
    motivo: M_DONO_TESTE,
    variaveis: { NOME_VIRGULA: 'Maria, ', LOJA_DA: 'da Fausto Burger Realengo', LINK: `${URL_SITE}/painel/assinatura?assinar=1&loja=EXEMPLO` },
  },

  /* ---------------------------- Cobrança ---------------------------- */
  {
    id: 'cobranca-ativa', tipo: 'transacional', segmento: 'TNC · Assinantes (1ª cobrança)',
    assunto: 'Pronto: a {{{LOJA}}} está assinada', previa: 'Assinatura confirmada. Pode seguir lançando.', rotulo: 'Assinatura',
    titulo: 'Pronto: a {{{LOJA}}} está assinada',
    blocos: [
      { p: '{{{NOME_VIRGULA}}}obrigado por assinar o Tá no Caixa. Está tudo liberado, é só seguir lançando.' },
      { lista: ['Valor: {{{VALOR}}} por mês', '{{{PROXIMA}}}', 'O recibo de cada mês chega por e-mail, enviado pelo Stripe.', 'A nota fiscal é emitida à parte e enviada depois.'] },
      { botao: { texto: 'Abrir o Tá no Caixa', url: l('/painel', 'cobranca-ativa') } },
      { nota: 'Para trocar o cartão, ver faturas ou cancelar: Assinatura › Trocar cartão e ver faturas, no app.' },
    ],
    motivo: M_ASSINATURA,
    variaveis: { NOME_VIRGULA: 'Maria, ', ...LOJA, VALOR: 'R$ 149,00', PROXIMA: 'Próxima cobrança: 6 de dezembro' },
  },
  {
    id: 'cobranca-falhou', tipo: 'transacional', segmento: 'TNC · Pagamento falhou (1ª tentativa)',
    assunto: 'Não conseguimos cobrar o cartão da {{{LOJA}}}', previa: 'Troque o cartão em um minuto para não interromper o acesso.', rotulo: 'Assinatura',
    titulo: 'Não conseguimos cobrar o cartão da {{{LOJA}}}',
    blocos: [
      { p: '{{{NOME_VIRGULA}}}a cobrança da assinatura não passou. Acontece: cartão vencido, limite ou bloqueio do banco. {{{QUANDO}}}' },
      { botao: { texto: 'Trocar o cartão', url: '{{{LINK}}}' } },
      { nota: 'Seus lançamentos continuam guardados.' },
    ],
    motivo: M_ASSINATURA,
    variaveis: { NOME_VIRGULA: 'Maria, ', ...LOJA, QUANDO: 'Vamos tentar de novo em 9 de dezembro.', LINK: `${URL_SITE}/painel/assinatura?portal=1&loja=EXEMPLO` },
  },
  {
    id: 'cobranca-falhou-final', tipo: 'transacional', segmento: 'TNC · Pagamento falhou (última tentativa)',
    assunto: 'Última tentativa: a cobrança da {{{LOJA}}} não passou', previa: 'Atualize o cartão para não interromper o acesso.', rotulo: 'Assinatura',
    titulo: 'A cobrança da {{{LOJA}}} não passou de novo',
    blocos: [
      { p: '{{{NOME_VIRGULA}}}tentamos cobrar algumas vezes e o cartão não passou. Para não interromper o acesso da loja, atualize o cartão.' },
      { botao: { texto: 'Trocar o cartão', url: '{{{LINK}}}' } },
      { nota: 'Seus lançamentos continuam guardados.' },
    ],
    motivo: M_ASSINATURA,
    variaveis: { NOME_VIRGULA: 'Maria, ', ...LOJA, LINK: `${URL_SITE}/painel/assinatura?portal=1&loja=EXEMPLO` },
  },
  {
    id: 'cobranca-cancelada', tipo: 'transacional', segmento: 'TNC · Cancelados',
    assunto: 'A assinatura da {{{LOJA}}} foi cancelada', previa: 'Seus dados ficam guardados.', rotulo: 'Assinatura',
    titulo: 'A assinatura da {{{LOJA}}} foi cancelada',
    blocos: [
      { p: '{{{NOME_VIRGULA}}}a assinatura da {{{LOJA}}} foi encerrada{{{ENCERRADA}}}. Vendas, despesas e estoque ficam guardados do jeito que estão.' },
      { p: 'Se quiser voltar, é só assinar de novo e continuar de onde parou.' },
      { botao: { texto: 'Assinar de novo', url: '{{{LINK}}}' } },
      { nota: 'Cancelou sem querer ou teve algum problema? Responda este e-mail que a gente ajuda.' },
    ],
    motivo: M_ASSINATURA,
    variaveis: { NOME_VIRGULA: 'Maria, ', ...LOJA, ENCERRADA: ' em 6 de novembro', LINK: `${URL_SITE}/painel/assinatura?assinar=1&loja=EXEMPLO` },
  },

  /* ------------------------------ Dono ------------------------------ */
  {
    id: 'boas-vindas', tipo: 'transacional', segmento: 'TNC · Donos (conta criada, D0)',
    assunto: 'Bem-vindo ao Tá no Caixa', previa: 'Sua conta está criada. Comece lançando o dia de hoje.', rotulo: 'Conta criada',
    titulo: '{{{OI}}}',
    blocos: [
      { p: 'Sua conta no Tá no Caixa está criada. Que bom ter você aqui.' },
      { p: 'O Tá no Caixa ajuda você a enxergar o dinheiro do seu restaurante: lance faturamento e despesas (inclusive por foto da nota) e acompanhe lucro, margem e custos no painel.' },
      { p: 'Para começar, lance o faturamento de hoje e uma despesa. Leva poucos minutos.' },
      { botao: { texto: 'Lançar o dia de hoje', url: l('/painel', 'boas-vindas') } },
      { nota: 'As integrações com lojas e plataformas estão marcadas como "Em breve" no app. Quando estiverem prontas, a gente avisa por aqui.' },
    ],
    motivo: 'Você recebe este e-mail porque acabou de criar sua conta no Tá no Caixa.',
    variaveis: { ...OI },
  },
  uso('dono-d1', 'TNC · Donos (D1, ainda sem venda lançada)', 'Leva 2 minutos: lance o dia de hoje', 'Balcão, iFood, salão: tudo num lançamento só.', 'Lance o dia de hoje', [
    { p: '{{{OI}}} O primeiro passo é lançar as vendas do dia. Você separa por canal (balcão, iFood, salão) e o painel já mostra o que entrou e o que saiu.' },
    { botao: { texto: 'Lançar as vendas de hoje', url: l('/painel', 'dono-d1') } },
  ]),
  uso('dono-d3', 'TNC · Donos (D3, menos de 3 despesas)', 'Tire foto da nota e pronto', 'A foto da nota vira despesa lançada.', 'A nota vira despesa pela foto', [
    { p: '{{{OI}}} Em vez de digitar, tire uma foto da nota. O Tá no Caixa lê o valor, a data e o fornecedor e lança a despesa para você conferir.' },
    { p: 'Aluguel, contador e outras contas que se repetem todo mês você lança uma vez só, e elas voltam sozinhas.' },
    { botao: { texto: 'Lançar uma despesa', url: l('/painel/despesas', 'dono-d3') } },
  ]),
  uso('dono-d6', 'TNC · Donos (D6, ainda sozinho na loja)', 'Chame quem fecha o caixa e quem cuida do estoque', 'Cada um vê só o que precisa.', 'Traga sua equipe', [
    { p: '{{{OI}}} Você não precisa lançar tudo sozinho. Convide sua equipe, e cada pessoa vê só a parte dela:' },
    { lista: ['Gestão: vê e lança tudo, como você.', 'Caixa: abre, fecha e confere o caixa. Não vê lucro nem despesas.', 'Cozinha: produtos e estoque. Não vê finanças.'] },
    { botao: { texto: 'Convidar a equipe', url: l('/painel/ajustes', 'dono-d6') } },
  ]),
  uso('dono-d9', 'TNC · Donos (D9, 5+ dias lançados)', 'Quanto a {{{LOJA}}} precisa vender para empatar', 'Metas e o caminho até o equilíbrio.', 'Quanto falta para empatar', [
    { p: '{{{OI}}} Com alguns dias lançados, o Tá no Caixa já calcula quanto a {{{LOJA}}} precisa vender no mês para pagar todos os custos.' },
    { p: 'Em Metas você vê esse número e quanto falta, dia a dia.' },
    { botao: { texto: 'Ver minhas metas', url: l('/painel/metas', 'dono-d9') } },
  ]),
  uso('dono-d13', 'TNC · Donos (D13)', 'O Tá no Caixa também te lembra pelo WhatsApp', 'Resumo do dia e lembretes no grupo da loja.', 'Lembretes pelo WhatsApp', [
    { p: '{{{OI}}} Ligue os lembretes do WhatsApp e receba no grupo da loja o resumo do dia e os avisos de conta a vencer e de dia sem lançamento.' },
    { botao: { texto: 'Ligar o WhatsApp', url: l('/painel/ajustes', 'dono-d13') } },
  ]),
  uso('dono-d20', 'TNC · Donos (D20, 20+ dias lançados)', 'Seu primeiro DRE do mês', 'Receita, custos e o que sobrou, em três linhas.', 'Seu primeiro DRE', [
    { p: '{{{OI}}} Com o mês quase todo lançado, o DRE da {{{LOJA}}} já conta a história do mês. Leia de cima para baixo:' },
    { lista: ['Receita: tudo o que entrou.', 'Custos: o que saiu, separado por grupo.', 'Resultado: o que sobrou no fim.'] },
    { botao: { texto: 'Abrir o DRE', url: l('/painel/dre', 'dono-d20') } },
  ]),

  /* ----------------------------- Gestão ----------------------------- */
  uso('gestao-d0', 'TNC · Gestão (entrou, D0)', 'Você agora cuida dos números da {{{LOJA}}}', 'O que dá para fazer como Gestão.', 'Você entrou na {{{LOJA}}} como Gestão', [
    { p: '{{{OI}}} Como Gestão, você vê e lança tudo na {{{LOJA}}}: vendas, despesas, estoque, caixa, DRE e metas.' },
    { p: 'Você também pode chamar pessoas para a equipe.' },
    { botao: { texto: 'Abrir o painel', url: l('/painel', 'gestao-d0') } },
  ]),
  uso('gestao-d2', 'TNC · Gestão (D2, ainda sem lançamento)', 'A rotina de 5 minutos do fim do dia', 'Lançar, conferir, fotografar.', 'A rotina do fim do dia', [
    { p: '{{{OI}}} Três passos no fim do dia deixam os números da {{{LOJA}}} sempre em dia:' },
    { lista: ['Lance as vendas do dia por canal.', 'Confira o fechamento do caixa.', 'Tire foto das notas do dia.'] },
    { botao: { texto: 'Lançar o dia', url: l('/painel', 'gestao-d2') } },
  ]),
  uso('gestao-d6', 'TNC · Gestão (D6)', 'Despesas do mês sem susto', 'Contas que se repetem, pagas e a vencer.', 'Despesas sem susto', [
    { p: '{{{OI}}} Em Despesas você marca o que já foi pago e vê o que vence nos próximos dias. Contas fixas você lança uma vez e elas se repetem todo mês.' },
    { botao: { texto: 'Ver despesas', url: l('/painel/despesas', 'gestao-d6') } },
  ]),
  uso('gestao-d10', 'TNC · Gestão (D10)', 'Ponha o caixa e a cozinha no app', 'Cada um lança a parte dele.', 'Traga o caixa e a cozinha', [
    { p: '{{{OI}}} Quem fecha o caixa e quem cuida do estoque podem lançar direto no celular. Eles não veem lucro nem despesas, só a parte deles.' },
    { botao: { texto: 'Convidar a equipe', url: l('/painel/ajustes', 'gestao-d10') } },
  ]),

  /* ------------------------------ Caixa ----------------------------- */
  uso('caixa-d0', 'TNC · Caixa (entrou, D0)', 'Seu acesso ao caixa da {{{LOJA}}}', 'Onde abrir e onde fechar o caixa.', 'Seu acesso ao caixa', [
    { p: '{{{OI}}} Você entrou na {{{LOJA}}} para cuidar do caixa. No Tá no Caixa você abre o caixa no começo do turno e fecha no fim, conferindo cada forma de pagamento.' },
    { p: 'Dica: no celular, salve o Tá no Caixa na tela inicial para abrir num toque.' },
    { botao: { texto: 'Abrir o caixa', url: l('/painel/caixa', 'caixa-d0') } },
  ]),
  uso('caixa-d3', 'TNC · Caixa (D3)', 'Fechar o caixa em 4 passos', 'Passo a passo do fechamento.', 'Fechar o caixa em 4 passos', [
    { lista: ['Abra o caixa com o valor de troco.', 'Ao fechar, conte o dinheiro da gaveta.', 'Confira cartão, Pix e apps.', 'Confirme o fechamento.'] },
    { botao: { texto: 'Ir para o caixa', url: l('/painel/caixa', 'caixa-d3') } },
  ]),
  uso('caixa-d10', 'TNC · Caixa (D10)', 'Quando o caixa não bate', 'O que fazer com diferença no fechamento.', 'Quando o caixa não bate', [
    { p: '{{{OI}}} Diferença no fechamento acontece. Antes de confirmar, confira troco, sangrias e pagamentos lançados na forma errada. Se a diferença continuar, anote o motivo no fechamento: quem gerencia a loja vê depois.' },
    { botao: { texto: 'Ir para o caixa', url: l('/painel/caixa', 'caixa-d10') } },
  ]),

  /* ----------------------------- Cozinha ---------------------------- */
  uso('cozinha-d0', 'TNC · Cozinha (entrou, D0)', 'O estoque da {{{LOJA}}} agora está com você', 'Produtos, entradas e saídas.', 'O estoque está com você', [
    { p: '{{{OI}}} Você entrou na {{{LOJA}}} para cuidar de produtos e estoque. No Tá no Caixa você vê o que tem, dá entrada no que chega e baixa o que usa.' },
    { botao: { texto: 'Abrir o estoque', url: l('/painel/estoque', 'cozinha-d0') } },
  ]),
  uso('cozinha-d3', 'TNC · Cozinha (D3)', 'Deu entrada? Lança na hora', 'Entrada de mercadoria pelo celular.', 'Lance na hora', [
    { p: '{{{OI}}} Chegou mercadoria? Lance a entrada na hora, pelo celular. Usou da reserva? Dê a baixa. Assim o estoque da {{{LOJA}}} fica sempre certo.' },
    { botao: { texto: 'Lançar no estoque', url: l('/painel/estoque', 'cozinha-d3') } },
  ]),
  uso('cozinha-d8', 'TNC · Cozinha (D8)', 'Pergunte ao estoque', 'O que está acabando? É só perguntar.', 'Pergunte ao estoque', [
    { p: '{{{OI}}} No estoque dá para perguntar em português mesmo: "o que está acabando?" ou "quanto tenho de carne?". O Tá no Caixa responde com o que está lançado.' },
    { botao: { texto: 'Perguntar ao estoque', url: l('/painel/estoque', 'cozinha-d8') } },
  ]),

  /* --------------------------- Franqueador -------------------------- */
  uso('franq-d0', 'TNC · Franqueadores (entrou, D0)', 'A rede inteira numa tela', 'O consolidado e o número de cada loja.', 'A rede inteira numa tela', [
    { p: '{{{OI}}} Na visão da rede você acompanha o consolidado de todas as lojas e abre o número de cada uma, sem precisar pedir planilha.' },
    { botao: { texto: 'Ver a rede', url: l('/painel/rede', 'franq-d0') } },
  ]),
  uso('franq-d3', 'TNC · Franqueadores (D3, menos de 2 lojas lançando)', 'Traga as lojas da rede', 'Cada loja lança, você acompanha.', 'Traga as lojas da rede', [
    { p: '{{{OI}}} Cada loja entra com o próprio dono e a própria assinatura. Quem lança é a loja; você acompanha tudo na visão da rede.' },
    { botao: { texto: 'Ver a rede', url: l('/painel/rede', 'franq-d3') } },
  ]),
  uso('franq-d8', 'TNC · Franqueadores (D8, 2+ lojas lançando)', 'Qual loja está puxando a rede', 'Margem, custo e faturamento lado a lado.', 'Qual loja puxa a rede', [
    { p: '{{{OI}}} O comparativo coloca as lojas lado a lado: faturamento, custos e margem. Fica fácil ver quem está indo bem e quem precisa de ajuda.' },
    { botao: { texto: 'Comparar as lojas', url: l('/painel/rede', 'franq-d8') } },
  ]),

  /* --------------------------- Recorrentes -------------------------- */
  {
    id: 'recado-semanal', tipo: 'uso', topico: 'recado', segmento: 'TNC · Donos e Gestão (recado de segunda)',
    assunto: 'Sua semana na {{{LOJA}}}: {{{ENTROU}}} entrou, {{{SAIU}}} saiu', previa: 'Os números da semana passada, em um minuto.', rotulo: 'Recado da semana',
    titulo: 'A semana da {{{LOJA}}}',
    blocos: [
      { lista: ['Entrou: {{{ENTROU}}}', 'Saiu: {{{SAIU}}}', 'Saldo: {{{SALDO}}}'] },
      { p: '{{{COMPARACAO}}}' },
      { p: '{{{ALERTA}}}' },
      { botao: { texto: 'Ver o painel', url: l('/painel', 'recado-semanal') } },
    ],
    motivo: 'Você recebe o recado de segunda porque usa o Tá no Caixa na {{{LOJA}}}.',
    variaveis: { ...LOJA, ENTROU: 'R$ 18.400', SAIU: 'R$ 11.250', SALDO: 'R$ 7.150', COMPARACAO: 'Entrou 8% mais que na semana anterior.', ALERTA: 'Sábado ficou sem lançamento.' },
  },
  {
    id: 'recado-rede', tipo: 'uso', topico: 'recado', segmento: 'TNC · Franqueadores (recado de segunda)',
    assunto: 'Semana da rede: {{{N_LOJAS}}} lojas, {{{TOTAL}}} no total', previa: 'O consolidado da rede na semana passada.', rotulo: 'Recado da semana',
    titulo: 'A semana da rede',
    blocos: [
      { lista: ['Lojas: {{{N_LOJAS}}}', 'Faturamento somado: {{{TOTAL}}}', 'Maior faturamento: {{{MELHOR_LOJA}}}'] },
      { p: '{{{SEM_LANCAMENTO}}}' },
      { botao: { texto: 'Ver a rede', url: l('/painel/rede', 'recado-rede') } },
    ],
    motivo: 'Você recebe o recado de segunda porque acompanha uma rede no Tá no Caixa.',
    variaveis: { N_LOJAS: '3', TOTAL: 'R$ 52.300', MELHOR_LOJA: 'Fausto Burger Barra (R$ 24.100)', SEM_LANCAMENTO: 'Fausto Burger Realengo ficou sem lançamento na semana.' },
  },
  {
    id: 'inativo-7', tipo: 'uso', topico: 'dicas', segmento: 'TNC · Inativos 7 dias',
    assunto: 'A {{{LOJA}}} está sem lançamento desde {{{DESDE}}}', previa: 'Dois minutos põem tudo em dia.', rotulo: 'Lembrete',
    titulo: 'A {{{LOJA}}} está sem lançamento',
    blocos: [
      { p: '{{{OI}}} O último lançamento da {{{LOJA}}} foi em {{{DESDE}}}. Lançar a semana de uma vez leva poucos minutos e deixa o painel em dia de novo.' },
      { botao: { texto: 'Lançar agora', url: l('/painel', 'inativo-7') } },
    ],
    motivo: M_USO, variaveis: { ...OI, ...LOJA, DESDE: '28 de outubro' },
  },
  {
    id: 'inativo-21', tipo: 'uso', topico: 'dicas', segmento: 'TNC · Inativos 21 dias (último aviso)',
    assunto: 'Seus números da {{{LOJA}}} continuam guardados', previa: 'Quando quiser voltar, está tudo lá.', rotulo: 'Lembrete',
    titulo: 'Está tudo guardado',
    blocos: [
      { p: '{{{OI}}} Faz três semanas que a {{{LOJA}}} não tem lançamento. Tudo o que você lançou continua lá. Quando quiser voltar, é só abrir o painel.' },
      { botao: { texto: 'Abrir o painel', url: l('/painel', 'inativo-21') } },
      { nota: 'Este é o último lembrete sobre isso.' },
    ],
    motivo: M_USO, variaveis: { ...OI, ...LOJA },
  },
  {
    id: 'novidades-mensal', tipo: 'novidades', topico: 'novidades', segmento: 'TNC · Donos, Gestão e Franqueadores (aceitaram novidades)',
    assunto: 'Novidades do Tá no Caixa em {{{MES}}}', previa: 'O que mudou no app este mês.', rotulo: 'Novidades',
    titulo: 'O que mudou em {{{MES}}}',
    blocos: [
      { lista: ['{{{NOVIDADE_1}}}', '{{{NOVIDADE_2}}}', '{{{NOVIDADE_3}}}'] },
      { p: 'Do blog: {{{ARTIGO}}}' },
      { botao: { texto: 'Abrir o Tá no Caixa', url: l('/painel', 'novidades-mensal') } },
    ],
    motivo: 'Você recebe as novidades porque pediu para receber no Tá no Caixa.',
    variaveis: {
      MES: 'novembro',
      NOVIDADE_1: 'Marcar como recebido direto na Receita',
      NOVIDADE_2: 'Calendário em todos os filtros de data',
      NOVIDADE_3: 'Convite por loja, com o papel de cada pessoa',
      ARTIGO: 'Qual dia cai o repasse do iFood',
    },
  },
]

const PORID = new Map(CATALOGO.map((d) => [d.id, d]))

export function defEmail(id: string): DefEmail {
  const d = PORID.get(id)
  if (!d) throw new Error(`e-mail desconhecido: ${id}`)
  return d
}

export const aliasDe = (id: string) => `tnc-${id}`

/** Variáveis presentes no texto de um e-mail (assunto, títulos, blocos, motivo). */
export function variaveisNoTexto(d: DefEmail): string[] {
  const tudo = JSON.stringify([d.assunto, d.previa, d.titulo, d.blocos, d.motivo])
  return [...new Set([...tudo.matchAll(/\{\{\{([A-Z0-9_]+)\}\}\}/g)].map((m) => m[1]))].sort()
}

export function preencher(s: string, vars: Record<string, string>): string {
  return s.replace(/\{\{\{([A-Z0-9_]+)\}\}\}/g, (_, k: string) => vars[k] ?? '')
}

function preencherBloco(b: Bloco, v: Record<string, string>): Bloco | null {
  if ('p' in b) return preencher(b.p, v).trim() ? { p: preencher(b.p, v) } : null
  if ('nota' in b) return preencher(b.nota, v).trim() ? { nota: preencher(b.nota, v) } : null
  if ('lista' in b) return { lista: b.lista.map((i) => preencher(i, v)).filter((i) => i.trim()) }
  return { botao: { texto: preencher(b.botao.texto, v), url: preencher(b.botao.url, v) } }
}

function conteudo(d: DefEmail, blocos: Bloco[], v: Record<string, string>, descadastro?: string): ConteudoEmail {
  return { previa: preencher(d.previa, v), rotulo: d.rotulo, titulo: preencher(d.titulo, v), blocos, motivo: preencher(d.motivo, v), descadastro }
}

export interface EmailPronto {
  id: string
  assunto: string
  html: string
  text: string
  /** Pra enviar pelo template do Resend (mesmo texto). */
  template: { id: string; variables: Record<string, string> }
}

/** Monta o e-mail com as variáveis. Parágrafo que ficaria vazio some. `botoes` troca o botão único por vários. */
export function renderizar(
  id: string,
  vars: Record<string, string>,
  opcoes: { descadastro?: string; botoes?: Array<{ texto: string; url: string }> } = {},
): EmailPronto {
  const d = defEmail(id)
  const v: Record<string, string> = {}
  for (const k of variaveisNoTexto(d)) v[k] = (vars[k] ?? '').replace(/[<>]/g, '')
  let blocos = d.blocos.map((b) => preencherBloco(b, v)).filter((b): b is Bloco => b !== null)
  if (opcoes.botoes?.length) {
    const i = blocos.findIndex((b) => 'botao' in b)
    const novos: Bloco[] = opcoes.botoes.map((b) => ({ botao: b }))
    blocos = i >= 0 ? [...blocos.slice(0, i), ...novos, ...blocos.slice(i + 1)] : [...blocos, ...novos]
  }
  const { html, text } = montarHtml(conteudo(d, blocos, v, opcoes.descadastro))
  const variables = { ...v, ...(d.topico ? { LINK_DESCADASTRO: opcoes.descadastro ?? URL_SITE } : {}) }
  return { id, assunto: preencher(d.assunto, v), html, text, template: { id: aliasDe(id), variables } }
}

/** HTML do template no Resend: o mesmo layout, com as variáveis no lugar. */
export function htmlDoTemplate(id: string): { html: string; variaveis: Array<{ key: string; type: 'string'; fallback_value: string }> } {
  const d = defEmail(id)
  const { html } = montarHtml(conteudo(d, d.blocos, Object.fromEntries(variaveisNoTexto(d).map((k) => [k, `{{{${k}}}}`])), d.topico ? '{{{LINK_DESCADASTRO}}}' : undefined))
  const chaves = [...variaveisNoTexto(d), ...(d.topico ? ['LINK_DESCADASTRO'] : [])]
  return { html, variaveis: chaves.map((key) => ({ key, type: 'string', fallback_value: '' })) }
}

/** Para testes e e-mail de amostra: o HTML não pode ter variável sobrando. */
export const sobrouVariavel = (s: string) => /\{\{\{[A-Z0-9_]+\}\}\}/.test(s)
