/**
 * API local de desenvolvimento: roda o Código.js REAL (apps-script/) em memória, com dados fictícios,
 * e responde no mesmo formato JSON do doPost. Serve para trabalhar nas telas sem tocar na planilha.
 *
 *   node tests/apps-script/mock-server.js            (porta 4000)
 *   $env:EXPO_PUBLIC_API_URL = "http://localhost:4000"; npm run web
 *
 * Usuários de teste (todos fictícios):
 *   Coord.Um / coord123        administrador e coordenador de "Coroinhas e Cerimoniários"
 *   Admin.Quatro / admin44     só administrador (cria missas e pastorais)
 *   Leitor.Cinco / leitor55    coordenador de "Leitores" e leitor (adulto)
 *   Mae.Dois / senha22         Ana (Coroinha) e Duda (pedido de entrada pendente)
 *   Pai.Tres / senha33         Beto (Cerimoniário) e Caio (Coroinha)
 *
 * Os dados ficam só em memória: reiniciar o servidor volta ao estado inicial.
 * Os e-mails "enviados" aparecem em http://localhost:4000/emails (links de redefinição, etc.).
 */
const http = require('node:http');
const { novoAmbiente } = require('./harness');

const PORTA = Number(process.env.PORT || 4000);
// planilha antiga em memória; depois convertida pela mesma função de migração que roda em produção
const { ctx, abas, emails, props, migrarParaMultiPastoral, semearExtras } = novoAmbiente({ migrar: false });

// Endereço do app web, para os links dos e-mails (como a propriedade APP_URL em produção)
props.APP_URL = process.env.APP_URL || 'http://localhost:3100';

// Missas extras, em dias e horários variados, para exercitar o calendário
function dia(delta, h, m) {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  d.setHours(0, 0, 0, 0);
  return { data: d, horario: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') };
}
abas.Missas.length = 1; // mantém o cabeçalho
[
  [dia(2, 19, 0), 'Missa de sábado', 3, 6, '', 2, 4, ''],
  [dia(3, 8, 0), 'Missa dominical', 3, 6, 'C003', 2, 4, ''],
  [dia(3, 10, 0), 'Missa dominical', 2, 3, 'C001, C003', 1, 2, 'C002'], // coroinhas cheia? (2 de 3)
  [dia(3, 19, 0), 'Missa dominical (noite)', 2, 2, 'C001, C003', 1, 2, ''], // coroinhas lotada
  [dia(10, 10, 0), 'Missa dominical', 3, 6, '', 2, 4, ''],
  [dia(17, 10, 0), 'Missa dominical', 3, 6, '', 2, 4, ''],
  [dia(24, 19, 30), 'Missa de festa', 4, 8, '', 3, 5, ''],
].forEach(([d, descricao, minC, maxC, coroinhas, minCe, maxCe, cerimoniarios]) => {
  abas.Missas.push([d.data, d.horario, descricao, minC, maxC, coroinhas, minCe, maxCe, cerimoniarios]);
});

migrarParaMultiPastoral();
semearExtras();

http
  .createServer((req, res) => {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors).end();
      return;
    }
    if (req.method === 'GET' && req.url === '/emails') {
      // e-mails que o servidor "enviou" (cadastro, redefinição de senha, lembretes)
      res
        .writeHead(200, { ...cors, 'Content-Type': 'application/json; charset=utf-8' })
        .end(JSON.stringify(emails.map((m) => ({ para: m.to, assunto: m.subject, corpo: m.body })), null, 2));
      return;
    }
    if (req.method !== 'POST') {
      res.writeHead(200, { ...cors, 'Content-Type': 'text/plain; charset=utf-8' }).end('API local de teste.');
      return;
    }
    const partes = [];
    req.on('data', (c) => partes.push(c));
    req.on('end', () => {
      // simula a lentidão do Apps Script, para ver os estados de carregamento
      setTimeout(() => {
        const saida = ctx.doPost({ postData: { contents: Buffer.concat(partes).toString('utf8') } });
        const corpo = saida.getContent();
        try {
          const { acao } = JSON.parse(Buffer.concat(partes).toString('utf8'));
          console.log(new Date().toLocaleTimeString('pt-BR'), acao, JSON.parse(corpo).ok ? 'ok' : JSON.parse(corpo).erro);
        } catch {
          console.log(new Date().toLocaleTimeString('pt-BR'), '(corpo inválido)');
        }
        res.writeHead(200, { ...cors, 'Content-Type': 'application/json; charset=utf-8' }).end(corpo);
      }, Number(process.env.ATRASO_MS || 400));
    });
  })
  .listen(PORTA, () => {
    console.log('API local em http://localhost:' + PORTA + '  (e-mails simulados: ' + emails.length + ')');
  });
