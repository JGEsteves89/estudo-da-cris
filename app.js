/* Estudo da Cris — tudo neste ficheiro. Os dados vêm de data.js (window.DADOS). */
(function () {
  'use strict';

  const DADOS = window.DADOS;
  const CHAVE = 'estudoCris';

  const LEIS = {
    CPA: { nome: 'CPA', cor: '#1CB0F6' },
    LTFP: { nome: 'LTFP', cor: '#58CC02' },
    RJAL: { nome: 'RJAL', cor: '#FF9600' },
    CRP: { nome: 'Constituição', cor: '#CE82FF' },
    CT: { nome: 'Código do Trabalho', cor: '#FF86D0' },
    LEI26: { nome: 'Lei 26/2016', cor: '#2BD1C4' },
    CCP: { nome: 'CCP', cor: '#FF4B4B' },
    SIADAP: { nome: 'SIADAP', cor: '#FFC800' },
    TODAS: { nome: 'Todas as leis', cor: '#777777' },
  };
  const ORDEM_LEIS = ['CPA', 'LTFP', 'RJAL', 'CRP', 'CT', 'LEI26', 'CCP', 'SIADAP'];
  const TOTAL_DIAS = 38;
  const TOTAL_PERGUNTAS = DADOS.dias.filter((d) => d.numero >= 2 && d.numero <= 37).reduce((s, d) => s + d.perguntas.length, 0);

  const DIAS = {};
  const PERGUNTAS = {};
  for (const d of DADOS.dias) {
    DIAS[d.numero] = d;
    for (const p of d.perguntas) PERGUNTAS[p.id] = p;
  }

  const $app = document.getElementById('app');

  // ---------------- Guardar ----------------
  function vazio() { return { dias: {}, ultima: {}, datasFeito: [], pontos: 0 }; }
  let E = carregar();
  function carregar() {
    try {
      const s = JSON.parse(localStorage.getItem(CHAVE));
      if (s && s.dias) return Object.assign(vazio(), s);
    } catch (e) { /* começa vazio */ }
    return vazio();
  }
  function guardar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(E)); } catch (e) { /* sem espaço */ }
  }
  function ed(n) {
    if (!E.dias[n]) E.dias[n] = { estado: 'por-fazer' };
    return E.dias[n];
  }

  // ---------------- Ajudas ----------------
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function md(s) { // só negrito e itálico
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  }
  function semMd(s) { return String(s || '').replace(/\*\*?/g, ''); }
  function hoje() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function diaAnterior(iso) {
    const [a, m, d] = iso.split('-').map(Number);
    const x = new Date(a, m - 1, d - 1);
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  }
  function estrelasDe(certas, total) {
    if (!total) return 3;
    const p = (certas / total) * 100;
    return p >= 90 ? 3 : p >= 60 ? 2 : 1;
  }
  function estrelasTxt(n) { return '⭐'.repeat(n) + '<span style="opacity:.25">' + '⭐'.repeat(3 - n) + '</span>'; }
  function pct(c, t) { return t ? Math.round((c / t) * 100) : 100; }
  function aleatorio(lista) { return lista[Math.floor(Math.random() * lista.length)]; }
  function cor(lei) { return (LEIS[lei] || LEIS.TODAS).cor; }
  function nomeLei(lei) { return (LEIS[lei] || LEIS.TODAS).nome; }
  function numeroDe(txt) { const m = String(txt || '').match(/\d+/); return m ? String(Number(m[0])) : ''; }
  function eCerta(p, resposta) {
    if (p.tipo === 'numero') return numeroDe(resposta) === p.correta;
    return resposta === p.correta;
  }

  // ---------------- Sequência e contas ----------------
  function sequencia() {
    const set = new Set(E.datasFeito);
    let d = hoje();
    if (!set.has(d)) d = diaAnterior(d);
    let n = 0;
    while (set.has(d)) { n++; d = diaAnterior(d); }
    return n;
  }
  function diasFeitos() { return Object.keys(E.dias).filter((n) => E.dias[n].estado === 'feito').length; }
  function perguntasCertas() {
    let s = 0;
    for (const n in E.dias) if (n >= 2 && n <= 37 && E.dias[n].melhor) s += E.dias[n].melhor.certas;
    return s;
  }
  function proximoDia() {
    for (let n = 1; n <= TOTAL_DIAS; n++) if (!E.dias[n] || E.dias[n].estado !== 'feito') return n;
    return null;
  }
  function idsErrados() {
    return Object.keys(E.ultima).filter((id) => PERGUNTAS[id] && !E.ultima[id].certa);
  }
  function registarResposta(p, resposta) {
    E.ultima[p.id] = { resposta, certa: eCerta(p, resposta) };
  }

  // ---------------- Mascote (marcador de livro) ----------------
  function mascote(humor, grande) {
    const olhos = humor === 'feliz'
      ? '<path d="M30 46 q6 -7 12 0" stroke="#3C3C3C" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M58 46 q6 -7 12 0" stroke="#3C3C3C" stroke-width="4" fill="none" stroke-linecap="round"/>'
      : '<circle cx="36" cy="45" r="6" fill="#3C3C3C"/><circle cx="64" cy="45" r="6" fill="#3C3C3C"/><circle cx="38" cy="43" r="2" fill="#fff"/><circle cx="66" cy="43" r="2" fill="#fff"/>';
    const boca = humor === 'feliz'
      ? '<path d="M38 60 q12 16 24 0 z" fill="#3C3C3C"/><path d="M44 64 q6 6 12 0" fill="#FF86A8"/>'
      : humor === 'animo'
        ? '<path d="M41 63 q9 6 18 0" stroke="#3C3C3C" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M27 34 l10 -3 M73 34 l-10 -3" stroke="#3C3C3C" stroke-width="3" stroke-linecap="round"/>'
        : '<path d="M40 61 q10 9 20 0" stroke="#3C3C3C" stroke-width="4" fill="none" stroke-linecap="round"/>';
    const extra = humor === 'feliz'
      ? '<path d="M88 14 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill="#FFC800" stroke="#E5A800" stroke-width="1.5"/>'
      : '';
    return '<svg class="mascote ' + (grande ? 'grande ' : '') + 'mascote-bob" viewBox="0 0 100 124" aria-hidden="true">' +
      '<path d="M14 10 q0 -8 8 -8 h56 q8 0 8 8 v108 l-36 -22 l-36 22 z" fill="#FFC800" stroke="#E5A800" stroke-width="4" stroke-linejoin="round"/>' +
      '<rect x="22" y="2" width="56" height="10" rx="4" fill="#FFD83D"/>' +
      '<circle cx="26" cy="58" r="6" fill="#FF9E9E" opacity=".7"/><circle cx="74" cy="58" r="6" fill="#FF9E9E" opacity=".7"/>' +
      olhos + boca + extra + '</svg>';
  }

  // ---------------- Confetis (feitos à mão) ----------------
  function confetis() {
    const c = document.createElement('canvas');
    c.id = 'confetis';
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const W = (c.width = innerWidth), H = (c.height = innerHeight);
    const cores = ['#58CC02', '#1CB0F6', '#FFC800', '#FF4B4B', '#CE82FF', '#FF9600'];
    const ps = Array.from({ length: 140 }, () => ({
      x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vy: 2 + Math.random() * 3, vx: -1.5 + Math.random() * 3,
      r: Math.random() * Math.PI, vr: -0.2 + Math.random() * 0.4, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, c: aleatorio(cores),
    }));
    const t0 = performance.now();
    (function passo(t) {
      ctx.clearRect(0, 0, W, H);
      for (const p of ps) {
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      }
      if (t - t0 < 2000 && c.isConnected) requestAnimationFrame(passo);
      else c.remove();
    })(t0);
  }

  // ---------------- Moldura ----------------
  function cabecalho(ativo) {
    const seq = sequencia();
    return '<header class="topo"><div class="wrap">' +
      '<a class="marca" href="#/">Estudo da Cris</a>' +
      '<div class="contadores"><span class="fogo" title="Dias seguidos">🔥 ' + seq + '</span><span class="pontos" title="Pontos">⭐ ' + E.pontos + '</span></div>' +
      '</div></header>' +
      '<nav class="nav"><div class="wrap">' +
      '<a href="#/" class="' + (ativo === 'inicio' ? 'ativo' : '') + '">Início</a>' +
      '<a href="#/erros" class="' + (ativo === 'erros' ? 'ativo' : '') + '">Erros</a>' +
      '<a href="#/plano" class="' + (ativo === 'plano' ? 'ativo' : '') + '">Plano</a>' +
      '</div></nav>';
  }
  function pagina(ativo, corpo) {
    $app.innerHTML = cabecalho(ativo) + '<main><div class="wrap">' + corpo + '</div></main>';
    window.scrollTo(0, 0);
    animarBarras();
  }
  function animarBarras() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelectorAll('[data-w]').forEach((el) => { el.style.width = el.dataset.w; });
    }));
  }
  function barra(rotulo, valor, total, cls) {
    return '<div class="barra-bloco"><div class="barra-rotulo"><span>' + rotulo + '</span><span>' + valor + ' / ' + total + '</span></div>' +
      '<div class="barra ' + cls + '"><div data-w="' + pct(valor, total) + '%"></div></div></div>';
  }

  // ---------------- Início ----------------
  let acabouDeFazer = null;

  function vistaInicio() {
    const feitos = diasFeitos();
    const prox = proximoDia();
    const seq = sequencia();
    let frase;
    if (feitos === 0 && !Object.keys(E.dias).length) frase = 'Olá, Cris! Vamos começar pelo Dia 1?';
    else if (prox === null) frase = 'Fizeste os 38 dias. Parabéns, Cris!';
    else frase = 'Bom trabalho até agora. Hoje é o Dia ' + prox + '.';
    let linhaSeq = '';
    if (seq > 0) linhaSeq = '<div style="margin-top:4px">🔥 ' + seq + (seq === 1 ? ' dia seguido!' : ' dias seguidos!') + '</div>';
    else if (E.datasFeito.length) linhaSeq = '<div class="sec" style="margin-top:4px">A sequência recomeçou. Hoje conta!</div>';

    let h = '<div class="ola">' + mascote('normal') + '<div class="balao">' + esc(frase) + linhaSeq + '</div></div>';
    h += '<div class="cartao cinza">' + barra('Dias feitos', feitos, TOTAL_DIAS, 'verde') + barra('Perguntas certas', perguntasCertas(), TOTAL_PERGUNTAS, 'azul') + '</div>';

    const unidades = [{ id: 'comecar', nome: 'Começar', cor: '#777777', dias: [1], info: 'Conhecer os índices' }]
      .concat(ORDEM_LEIS.map((l) => {
        const ds = DADOS.dias.filter((d) => d.lei === l).map((d) => d.numero);
        return { id: l, nome: nomeLei(l), cor: cor(l), dias: ds, info: 'Dias ' + ds[0] + '–' + ds[ds.length - 1] };
      }))
      .concat([{ id: 'revisao', nome: 'Revisão', cor: '#777777', dias: [38], info: 'Refazer as perguntas erradas' }]);

    for (const u of unidades) {
      h += '<section class="unidade"><div class="unidade-cab" style="background:' + u.cor + '"><div class="u-nome">' + esc(u.nome) + '</div><div class="u-info">' + esc(u.info) + '</div></div>';
      for (const n of u.dias) h += cartaoDia(n, n === prox);
      h += '</section>';
    }

    h += '<div class="rodape">' +
      '<button class="link-pequeno" id="exportar">Exportar progresso</button>' +
      '<button class="link-pequeno" id="importar">Importar progresso</button>' +
      '<button class="link-pequeno perigo" id="recomecar">Recomeçar tudo</button>' +
      '<input type="file" id="ficheiro" accept=".json,application/json" hidden></div>';

    pagina('inicio', h);

    if (acabouDeFazer) {
      const el = document.getElementById('dia-' + acabouDeFazer);
      if (el) { el.classList.add('pop'); el.scrollIntoView({ block: 'center' }); }
      acabouDeFazer = null;
    }

    document.getElementById('exportar').onclick = exportar;
    document.getElementById('importar').onclick = () => document.getElementById('ficheiro').click();
    document.getElementById('ficheiro').onchange = importar;
    document.getElementById('recomecar').onclick = () => {
      if (confirm('Apagar todo o progresso? Isto não se desfaz.')) { E = vazio(); guardar(); vistaInicio(); }
    };
  }

  function cartaoDia(n, ehHoje) {
    const d = DIAS[n];
    const s = E.dias[n] || { estado: 'por-fazer' };
    let estado = '⬜ Por fazer';
    if (s.estado === 'comecado') estado = '🟡 Começado';
    if (s.estado === 'feito') estado = '✅ Feito' + (s.melhor && s.melhor.total ? ' <strong>' + s.melhor.certas + '/' + s.melhor.total + '</strong>' : '');
    const corCirc = d.lei === 'TODAS' ? '#777777' : cor(d.lei);
    const estrelas = s.estado === 'feito' && s.estrelas ? '<div class="estrelas">' + '⭐'.repeat(s.estrelas) + '</div>' : '';
    return '<a class="dia' + (ehHoje ? ' hoje' : '') + '" id="dia-' + n + '" href="#/dia/' + n + '">' +
      '<div class="circ" style="background:' + corCirc + '">' + n + '</div>' +
      '<div class="info">' + (ehHoje ? '<span class="etiqueta">Hoje</span> ' : '') +
      '<div class="tema">' + esc(semMd(d.tema)) + '</div><div class="estado">' + estado + '</div></div>' + estrelas +
      (ehHoje ? '<span class="btn">Começar</span>' : '') + '</a>';
  }

  function exportar() {
    const blob = new Blob([JSON.stringify(E, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'progresso-cris.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importar(ev) {
    const f = ev.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const s = JSON.parse(r.result);
        if (!s || typeof s.dias !== 'object') throw new Error();
        if (!confirm('Trocar o progresso atual pelo progresso deste ficheiro?')) return;
        E = Object.assign(vazio(), s); guardar(); vistaInicio();
        alert('Progresso carregado.');
      } catch (e) { alert('Este ficheiro não é um progresso válido.'); }
    };
    r.readAsText(f);
  }

  // ---------------- Passo 1: Estudar ----------------
  function vistaDia(n) {
    const d = DIAS[n];
    if (!d) return ir('#/');
    if (n === 38) return vistaRevisao();
    const s = E.dias[n] || {};
    const corD = d.lei === 'TODAS' ? '#777777' : cor(d.lei);
    let h = '<div class="dia-cab" style="background:' + corD + '"><h1>Dia ' + n + ' · ' + esc(d.lei === 'TODAS' ? 'Índices' : nomeLei(d.lei)) + '</h1><div class="t">' + md(d.tema) + '</div></div>';

    if (d.especial === 'indices') {
      h += '<div class="cartao"><h3>📖 O que fazer</h3><div>' + md(d.oQueFazer).replace(/\n\n/g, '<br><br>') + '</div></div>';
      h += '<div class="cartao"><h3>🎯 O caminho na prova</h3><div>' + md(d.oQueEstudar) + '</div></div>';
      h += '<div class="cartao"><h3>⏱️ O teste de hoje</h3><div>Para cada título, escreve o <strong>número do artigo</strong>. Usa só o índice. Meta: menos de 1 minuto cada.</div></div>';
    } else {
      const nome = nomeLei(d.lei);
      h += '<div class="cartao"><h3>📖 O que ler</h3><div class="grande">' + esc(nome) + ', artigos ' + esc(d.artigosLer) + '</div>' +
        '<p class="sec" style="margin-bottom:0">Abre o índice da lei e vai a estes artigos. Lê com calma. Não é preciso decorar.</p></div>';
      h += '<div class="cartao"><h3>🎯 Artigos para focar</h3><ul class="focar">' + d.artigosFocar.map((a) =>
        '<li><span><strong>' + esc(a.artigo) + '</strong>' + (a.titulo ? ' — ' + esc(a.titulo) : '') + '</span>' +
        (a.nPerguntas ? '<span class="tag">' + a.nPerguntas + ' perguntas</span>' : '') + '</li>').join('') + '</ul></div>';
      const primeiro = (String(d.artigosLer).match(/\d+\.º/) || [''])[0];
      h += '<div class="cartao"><h3>🔖 Separador a pôr na lei</h3><span class="separador" style="background:' + corD + '">' +
        esc(nome) + ' — art. ' + esc(primeiro) + ' · ' + esc(semMd(d.tema)) + '</span>' +
        '<p class="sec peq" style="margin-bottom:0">Só separadores. Não escrever nem sublinhar nas leis (não é permitido na prova).</p></div>';
      h += '<div class="cartao"><h3>✏️ Caderno</h3>Escreve 3 a 5 linhas no caderno: tema → artigo. Ex.: Prazo geral = 10 dias úteis → CPA 86.º</div>';
    }

    const t = s.tentativa;
    const total = d.perguntas.length;
    h += '<div class="btns">';
    if (t && t.terminada) {
      h += '<a class="btn" href="#/resultados/' + n + '">Ver resultados do teste</a>';
      h += '<button class="btn sec2" id="comecar">Fazer o teste outra vez</button>';
    } else if (t) {
      h += '<button class="btn" id="comecar">Continuar o teste <span class="sub">(pergunta ' + (t.posicao + 1) + ' de ' + total + ')</span></button>';
    } else {
      h += '<button class="btn" id="comecar">Já estudei · Começar o teste <span class="sub">(' + total + ' perguntas)</span></button>';
    }
    h += '<a class="btn sec2" href="#/">Voltar</a></div>';
    pagina('inicio', h);

    document.getElementById('comecar').onclick = () => {
      const e = ed(n);
      if (!e.tentativa || e.tentativa.terminada) e.tentativa = { ids: d.perguntas.map((p) => p.id), respostas: {}, posicao: 0 };
      if (e.estado !== 'feito') e.estado = 'comecado';
      guardar();
      ir('#/teste/' + n);
    };
  }

  function vistaRevisao() {
    const errados = idsErrados();
    const s = E.dias[38] || {};
    let h = '<div class="dia-cab" style="background:#777777"><h1>Dia 38 · Revisão</h1><div class="t">Refazer as perguntas erradas</div></div>';
    const t = s.tentativa;
    if (t && !t.terminada) {
      h += '<div class="cartao">Tens um teste de revisão a meio.</div><div class="btns"><a class="btn" href="#/teste/38">Continuar o teste <span class="sub">(pergunta ' + (t.posicao + 1) + ' de ' + t.ids.length + ')</span></a>';
    } else if (!errados.length) {
      h += '<div class="ola">' + mascote('feliz') + '<div class="balao">Não tens perguntas falhadas. Parabéns!</div></div><div class="btns">';
      if (s.estado !== 'feito') h += '<button class="btn" id="marcar">Marcar dia como feito</button>';
    } else {
      h += '<div class="cartao"><h3>🔁 O teste de hoje</h3>Vais refazer <strong>' + errados.length + '</strong> ' + (errados.length === 1 ? 'pergunta que falhaste' : 'perguntas que falhaste') + '. Antes, abre a lei nos artigos que estão na página <a href="#/erros">Erros</a>.</div>';
      h += '<div class="btns"><button class="btn" id="comecar">Começar a revisão <span class="sub">(' + errados.length + ' perguntas)</span></button>';
      if (t && t.terminada) h += '<a class="btn sec2" href="#/resultados/38">Ver resultados anteriores</a>';
    }
    h += '<a class="btn sec2" href="#/">Voltar</a></div>';
    pagina('inicio', h);
    const b = document.getElementById('comecar');
    if (b) b.onclick = () => comecarRevisao();
    const m = document.getElementById('marcar');
    if (m) m.onclick = () => marcarFeito(38, 0, 0);
  }

  function comecarRevisao() {
    const errados = idsErrados();
    if (!errados.length) return ir('#/dia/38');
    const e = ed(38);
    e.tentativa = { ids: errados, respostas: {}, posicao: 0 };
    if (e.estado !== 'feito') e.estado = 'comecado';
    guardar();
    ir('#/teste/38');
  }

  // ---------------- Passo 2: Teste ----------------
  // Também usado para "repetir só as erradas" (treino), que não é guardado na nota.
  let treino = null;

  function vistaTeste(n, modoTreino) {
    const t = modoTreino ? treino : (E.dias[n] || {}).tentativa;
    if (!t) return ir('#/dia/' + n);
    if (t.terminada) return ir(modoTreino ? '#/dia/' + n : '#/resultados/' + n);
    const total = t.ids.length;
    const p = PERGUNTAS[t.ids[t.posicao]];
    const ultima = t.posicao === total - 1;
    const respondida = Object.prototype.hasOwnProperty.call(t.respostas, p.id);
    let escolha = respondida ? t.respostas[p.id] : null;

    let h = '<div class="wrap"><div class="licao-topo"><button class="fechar" id="sair" aria-label="Sair">✕</button>' +
      '<div class="barra verde"><div data-w="' + pct(t.posicao, total) + '%"></div></div><span class="contagem">' + (t.posicao + 1) + '/' + total + '</span></div>';
    if (n === 38 || modoTreino) h += '<div class="sec peq">Dia ' + p.dia + ' · ' + esc(p.lei === 'TODAS' ? 'Índices' : nomeLei(p.lei)) + (modoTreino ? ' · treino' : '') + '</div>';
    h += '<div class="pergunta">' + md(p.texto) + '</div>';
    if (p.tipo === 'numero') {
      h += '<input class="caixa-numero" id="numero" inputmode="numeric" autocomplete="off" placeholder="Número do artigo" value="' + esc(escolha || '') + '"' + (respondida ? ' disabled' : '') + '>';
    } else {
      h += '<div class="opcoes">' + ['a', 'b', 'c', 'd'].map((l) =>
        '<button class="opcao" data-l="' + l + '"' + (respondida ? ' disabled' : '') + '><span class="letra">' + l + '</span><span>' + md(p.opcoes[l]) + '</span></button>').join('') + '</div>';
    }
    h += '<div class="espaco-fundo"></div></div><div class="fundo-fixo" id="fundo"><div class="wrap" id="fundo-in"></div></div>';
    $app.innerHTML = h;
    window.scrollTo(0, 0);
    animarBarras();

    const $fundo = document.getElementById('fundo');
    const $fundoIn = document.getElementById('fundo-in');

    document.getElementById('sair').onclick = () => {
      if (modoTreino) { if (confirm('Sair do treino?')) { treino = null; ir('#/resultados/' + n); } return; }
      if (confirm('Sair? As respostas ficam guardadas.')) ir('#/');
    };

    function botaoVerificar() {
      $fundo.className = 'fundo-fixo';
      $fundoIn.innerHTML = '<button class="btn" id="verificar"' + (escolha ? '' : ' disabled') + '>Verificar</button>';
      document.getElementById('verificar').onclick = verificar;
    }
    function mostrarCorrecao(animar) {
      const certa = eCerta(p, escolha);
      if (p.tipo === 'numero') {
        const c = document.getElementById('numero');
        c.classList.add(certa ? 'certa' : 'errada');
        if (animar) c.classList.add(certa ? 'alegria' : 'abana');
      } else {
        document.querySelectorAll('.opcao').forEach((b) => {
          b.disabled = true; b.classList.remove('sel');
          if (b.dataset.l === p.correta) { b.classList.add('certa'); if (animar && certa) b.classList.add('alegria'); }
          else if (b.dataset.l === escolha) { b.classList.add('errada'); if (animar) b.classList.add('abana'); }
        });
      }
      const titulo = certa ? '✅ ' + aleatorio(['Muito bem!', 'Certo!', 'Boa!']) : '❌ ' + aleatorio(['Não é essa.', 'Quase.']);
      let extra = '';
      if (!certa && p.tipo === 'numero') extra = '<div class="onde">Resposta certa: art. ' + esc(p.correta) + '.º<br>📍 Onde está: ' + esc(p.ondeEsta) + '</div>';
      else if (!certa) extra = '<div class="onde">📍 Onde está: ' + esc(p.ondeEsta) + '</div>';
      else extra = '<div class="onde"></div>';
      $fundo.className = 'fundo-fixo ' + (certa ? 'bom' : 'mau');
      $fundoIn.innerHTML = '<div class="subir"><div class="feedback">' + titulo + '</div>' + extra +
        '<button class="btn" id="continuar">' + (ultima ? 'Ver resultados' : 'Continuar') + '</button></div>';
      document.getElementById('continuar').onclick = continuar;
    }
    function verificar() {
      if (!escolha) return;
      t.respostas[p.id] = escolha;
      registarResposta(p, escolha);
      guardar();
      mostrarCorrecao(true);
    }
    function continuar() {
      if (ultima) {
        t.terminada = true;
        if (!modoTreino) {
          const e = ed(n);
          const certas = t.ids.filter((id) => eCerta(PERGUNTAS[id], t.respostas[id])).length;
          t.nota = { certas, total };
          if (!e.pontosGanhos && n !== 38) { e.pontosGanhos = true; E.pontos += certas; t.pontosNovos = certas; }
          guardar();
          ir('#/resultados/' + n);
        } else {
          ir('#/treino-fim/' + n);
        }
        return;
      }
      t.posicao++;
      if (!modoTreino) guardar();
      vistaTeste(n, modoTreino);
    }

    if (respondida) { mostrarCorrecao(false); return; }
    botaoVerificar();
    if (p.tipo === 'numero') {
      const c = document.getElementById('numero');
      c.oninput = () => { escolha = c.value.trim() && numeroDe(c.value) ? c.value.trim() : null; document.getElementById('verificar').disabled = !escolha; };
      c.onkeydown = (ev) => { if (ev.key === 'Enter' && escolha) verificar(); };
      setTimeout(() => c.focus(), 50);
    } else {
      document.querySelectorAll('.opcao').forEach((b) => {
        b.onclick = () => {
          document.querySelectorAll('.opcao').forEach((x) => x.classList.remove('sel'));
          b.classList.add('sel');
          escolha = b.dataset.l;
          document.getElementById('verificar').disabled = false;
        };
      });
    }
  }

  // ---------------- Passo 3: Resultados ----------------
  function fraseNota(p) {
    if (p >= 90) return 'Excelente! Já dominas este bloco.';
    if (p >= 60) return 'Bom! Vê as erradas e lê o artigo outra vez.';
    return 'Este bloco é difícil. Lê o artigo com calma e repete amanhã.';
  }

  function cartaoPergunta(p, resposta) {
    const certa = eCerta(p, resposta);
    let h = '<div class="cartao res-q ' + (certa ? 'bem' : 'mal') + '"><div class="q">' + (certa ? '✅ ' : '❌ ') + md(p.texto) + '</div>';
    if (p.tipo === 'numero') {
      h += '<div class="linha">A tua resposta: <strong class="' + (certa ? 'verde-t' : 'vermelho-t') + '">' + esc(resposta || '—') + '</strong></div>';
      if (!certa) h += '<div class="linha">Resposta certa: <strong class="verde-t">art. ' + esc(p.correta) + '.º</strong></div>';
      h += '<div class="linha"><strong>📍 Onde está: ' + esc(p.ondeEsta) + '</strong></div>';
    } else {
      const sua = resposta ? resposta + ') ' + p.opcoes[resposta] : '—';
      h += '<div class="linha">A tua resposta: <strong class="' + (certa ? 'verde-t' : 'vermelho-t') + '">' + md(sua) + '</strong></div>';
      if (!certa) h += '<div class="linha">Resposta certa: <strong class="verde-t">' + md(p.correta + ') ' + p.opcoes[p.correta]) + '</strong></div>';
      h += '<div class="linha"><strong>📍 Onde está: ' + esc(p.ondeEsta) + '</strong></div>';
      h += '<div class="linha">' + md(p.explicacao) + '</div>';
      h += '<div class="origem">' + esc(p.origem) + '</div>';
    }
    return h + '</div>';
  }

  function listaResultados(t) {
    const erradas = t.ids.filter((id) => !eCerta(PERGUNTAS[id], t.respostas[id]));
    const certas = t.ids.filter((id) => eCerta(PERGUNTAS[id], t.respostas[id]));
    return { erradas, certas, html: erradas.concat(certas).map((id) => cartaoPergunta(PERGUNTAS[id], t.respostas[id])).join('') };
  }

  function vistaResultados(n) {
    const e = E.dias[n];
    const t = e && e.tentativa;
    if (!t || !t.terminada) return ir('#/dia/' + n);
    const { certas, total } = t.nota;
    const p = pct(certas, total);
    const est = estrelasDe(certas, total);
    const r = listaResultados(t);
    const primeiraVez = !t.confetisVistos;

    let h = '<div class="res-topo">' + mascote(p >= 80 ? 'feliz' : 'animo', true) +
      '<div class="nota">' + certas + ' / ' + total + '</div><div class="pct">' + p + '%</div>' +
      '<div class="estrelas-g">' + estrelasTxt(est) + '</div>' +
      '<div class="balao" style="display:inline-block;margin-top:6px">' + esc(fraseNota(p)) + '</div><br>' +
      (t.pontosNovos != null ? '<div class="ganhos">+' + t.pontosNovos + ' ⭐</div>' : (n === 38 ? '' : '<div class="sec peq" style="margin-top:8px">Os pontos deste dia já foram ganhos da primeira vez.</div>')) +
      '</div>';
    h += '<h2 style="margin-top:28px">As tuas respostas</h2>' + r.html;
    h += '<div class="btns">';
    if (r.erradas.length) h += '<button class="btn sec2" id="repetir">Repetir só as erradas</button>';
    h += '<button class="btn" id="marcar">Marcar dia como feito</button>';
    h += '<a class="btn sec2" href="#/">Voltar ao início</a></div>';
    pagina('inicio', h);
    if (primeiraVez) { t.confetisVistos = true; guardar(); confetis(); }

    document.getElementById('marcar').onclick = () => marcarFeito(n, certas, total);
    const rep = document.getElementById('repetir');
    if (rep) rep.onclick = () => {
      treino = { ids: r.erradas.slice(), respostas: {}, posicao: 0 };
      ir('#/treino/' + n);
    };
  }

  function vistaTreinoFim(n) {
    if (!treino || !treino.terminada) return ir('#/resultados/' + n);
    const certas = treino.ids.filter((id) => eCerta(PERGUNTAS[id], treino.respostas[id])).length;
    const total = treino.ids.length;
    const r = listaResultados(treino);
    let h = '<div class="res-topo">' + mascote(pct(certas, total) >= 80 ? 'feliz' : 'animo', true) +
      '<div class="nota">' + certas + ' / ' + total + '</div><div class="pct">Treino das erradas</div>' +
      '<p class="sec">A nota do dia não muda. Isto é só para treinar.</p></div>' + r.html +
      '<div class="btns"><a class="btn" href="#/resultados/' + n + '">Voltar aos resultados do dia</a><a class="btn sec2" href="#/">Voltar ao início</a></div>';
    pagina('inicio', h);
    if (certas === total) confetis();
  }

  function marcarFeito(n, certas, total) {
    const e = ed(n);
    e.estado = 'feito';
    e.nota = { certas, total };
    if (!e.melhor || pct(certas, total) > pct(e.melhor.certas, e.melhor.total) || (e.melhor.total === 0 && total > 0)) e.melhor = { certas, total };
    e.estrelas = estrelasDe(e.melhor.certas, e.melhor.total);
    e.feitoEm = hoje();
    if (e.tentativa) e.respostas = e.tentativa.respostas;
    delete e.tentativa;
    if (!E.datasFeito.includes(hoje())) E.datasFeito.push(hoje());
    guardar();
    acabouDeFazer = n;
    ir('#/');
  }

  // ---------------- Erros ----------------
  function vistaErros() {
    const ids = idsErrados();
    let h = '<h1>Registo de erros</h1>';
    if (!ids.length) {
      h += '<div class="ola">' + mascote('feliz') + '<div class="balao">Não tens perguntas falhadas. Parabéns!</div></div>';
      return pagina('erros', h);
    }
    const grupos = {};
    for (const id of ids) { const l = PERGUNTAS[id].lei; (grupos[l] = grupos[l] || []).push(id); }
    const ordem = ['TODAS'].concat(ORDEM_LEIS).filter((l) => grupos[l]);
    const max = Math.max(...ordem.map((l) => grupos[l].length));
    const pior = ordem.slice().sort((a, b) => grupos[b].length - grupos[a].length)[0];
    h += '<p class="sec">' + ids.length + (ids.length === 1 ? ' pergunta falhada.' : ' perguntas falhadas.') + ' Uma pergunta sai da lista quando acertares nela.</p>';
    h += '<div class="cartao cinza"><div style="margin-bottom:8px">Lei com mais erros: <strong>' + esc(pior === 'TODAS' ? 'Índices' : nomeLei(pior)) + '</strong> (' + grupos[pior].length + ')</div><div class="barras-lei">' +
      ordem.map((l) => '<div class="l"><span class="n">' + esc(l === 'TODAS' ? 'Índices' : nomeLei(l)) + '</span><div class="b"><div data-w="' + pct(grupos[l].length, max) + '%" style="background:' + cor(l) + '"></div></div><span class="c">' + grupos[l].length + '</span></div>').join('') +
      '</div></div>';
    h += '<div class="btns" style="margin:16px 0 8px"><button class="btn" id="refazer">Refazer todas as erradas</button></div>';
    for (const l of ordem) {
      h += '<section class="unidade"><div class="unidade-cab" style="background:' + cor(l) + '"><div class="u-nome">' + esc(l === 'TODAS' ? 'Índices' : nomeLei(l)) + '</div><div class="u-info">' + grupos[l].length + ' erradas</div></div>';
      const lista = grupos[l].slice().sort((a, b) => PERGUNTAS[a].dia - PERGUNTAS[b].dia || a.localeCompare(b, undefined, { numeric: true }));
      for (const id of lista) {
        const p = PERGUNTAS[id];
        h += '<details class="erro"><summary><div class="meta">Dia ' + p.dia + ' · ' + esc(p.lei === 'TODAS' ? 'Índices' : nomeLei(p.lei)) + ' · ' + esc(p.ondeEsta) + '</div><div class="inicio">' + esc(semMd(p.texto)) + '</div></summary>' +
          '<div class="corpo">' + cartaoPergunta(p, E.ultima[id].resposta) + '</div></details>';
      }
      h += '</section>';
    }
    pagina('erros', h);
    document.getElementById('refazer').onclick = comecarRevisao;
  }

  // ---------------- Plano ----------------
  function mdParaHtml(texto) {
    const linhas = texto.split('\n');
    let out = '', i = 0, emLista = false;
    const fechaLista = () => { if (emLista) { out += '</ul>'; emLista = false; } };
    while (i < linhas.length) {
      const l = linhas[i];
      if (/^\|/.test(l)) {
        fechaLista();
        const rows = [];
        while (i < linhas.length && /^\|/.test(linhas[i])) { rows.push(linhas[i]); i++; }
        const cel = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        out += '<table><thead><tr>' + cel(rows[0]).map((c) => '<th>' + md(c) + '</th>').join('') + '</tr></thead><tbody>' +
          rows.slice(2).map((r) => '<tr>' + cel(r).map((c) => '<td>' + md(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
        continue;
      }
      let m;
      if ((m = l.match(/^(#{2,4})\s+(.*)$/))) { fechaLista(); const n = m[1].length; out += '<h' + n + '>' + md(m[2]) + '</h' + n + '>'; }
      else if ((m = l.match(/^\s*(?:-|\d+\.)\s+(.*)$/))) { if (!emLista) { out += '<ul>'; emLista = true; } out += '<li>' + md(m[1]) + '</li>'; }
      else if (/^---\s*$/.test(l) || !l.trim()) { fechaLista(); }
      else { fechaLista(); out += '<p>' + md(l.replace(/^>\s?/, '')) + '</p>'; }
      i++;
    }
    fechaLista();
    return out;
  }
  function vistaPlano() {
    // Só a tabela dos dias e as 3 fases.
    const partes = DADOS.plano.split(/^(?=## )/m);
    const escolhidas = partes.filter((p) => /^## (2|4|5)\./.test(p));
    pagina('plano', '<h1>Plano de estudo</h1><div class="plano">' + mdParaHtml(escolhidas.join('\n')) + '</div>');
  }

  // ---------------- Rotas ----------------
  function ir(hash) {
    if (location.hash === hash) rota(); else location.hash = hash;
  }
  function rota() {
    const c = document.getElementById('confetis');
    if (c) c.remove();
    const h = location.hash.replace(/^#/, '') || '/';
    let m;
    if ((m = h.match(/^\/dia\/(\d+)$/))) return vistaDia(Number(m[1]));
    if ((m = h.match(/^\/teste\/(\d+)$/))) return vistaTeste(Number(m[1]), false);
    if ((m = h.match(/^\/treino\/(\d+)$/))) return vistaTeste(Number(m[1]), true);
    if ((m = h.match(/^\/treino-fim\/(\d+)$/))) return vistaTreinoFim(Number(m[1]));
    if ((m = h.match(/^\/resultados\/(\d+)$/))) return vistaResultados(Number(m[1]));
    if (h === '/erros') return vistaErros();
    if (h === '/plano') return vistaPlano();
    return vistaInicio();
  }
  window.addEventListener('hashchange', rota);
  rota();
})();
