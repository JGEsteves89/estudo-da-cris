#!/usr/bin/env node
// Lê as fichas diárias (só leitura) e gera os dados do site.
// Saída: build/data.json e ../data.js (os dados embutidos, para abrir com duplo clique).
// Uso: node build/converter.js

const fs = require('fs');
const path = require('path');

const LEIS_DIR = path.resolve(__dirname, '../../documentos/leis');
const FICHAS_DIR = path.join(LEIS_DIR, 'fichas_diarias');
const OUT_JSON = path.join(__dirname, 'data.json');
const OUT_JS = path.resolve(__dirname, '../data.js');

const LEI_POR_FICHEIRO = { CPA: 'CPA', LTFP: 'LTFP', RJAL: 'RJAL', CRP: 'CRP', CT: 'CT', LEI26: 'LEI26', CCP: 'CCP', SIADAP: 'SIADAP' };

const erros = [];
const falha = (msg) => erros.push(msg);

// Divide a ficha nas secções "## N. ..."
function seccoes(md) {
  const out = {};
  const partes = md.split(/^## /m);
  for (const p of partes.slice(1)) {
    const m = p.match(/^(\d)\./);
    if (m) out[m[1]] = p;
  }
  return out;
}

function limpa(s) {
  return s.replace(/\s+$/g, '').replace(/ {2,}$/g, '').trim();
}

function lerFichaNormal(ficheiro, numero, lei) {
  const md = fs.readFileSync(path.join(FICHAS_DIR, ficheiro), 'utf8');
  const sec = seccoes(md);
  const tema = ((md.match(/^\*\*Tema:\*\*\s*(.+)$/m) || [])[1] || '').trim();
  if (!tema) falha(`${ficheiro}: sem tema`);

  // 1. O que ler
  const ler = sec['1'] || '';
  const mLer = ler.match(/artigos?:\s*\*\*(.+?)\*\*/) || ler.match(/\*\*([^*]*\d[^*]*)\*\*/);
  const artigosLer = mLer ? limpa(mLer[1]).replace(/\.$/, '') : null;
  if (!artigosLer) falha(`${ficheiro}: sem "O que ler"`);

  // 2. O que estudar
  const artigosFocar = [];
  for (const linha of (sec['2'] || '').split('\n')) {
    if (!/^- /.test(linha)) continue;
    let t = linha.slice(2).trim();
    let nPerguntas = null;
    const mn = t.match(/\s*\*\((\d+) perguntas?\)\*\s*$/);
    if (mn) { nPerguntas = Number(mn[1]); t = t.slice(0, mn.index).trim(); }
    const partes = t.split(' — ');
    const artigo = partes.length > 1 ? partes[0].trim() : t;
    const titulo = partes.length > 1 ? partes.slice(1).join(' — ').trim() : '';
    artigosFocar.push({ artigo, titulo, nPerguntas });
  }
  if (!artigosFocar.length) falha(`${ficheiro}: sem artigos para focar`);

  // 3. Perguntas
  const perguntas = [];
  const blocosP = (sec['3'] || '').split(/^\*\*(?=\d+\.\s)/m).slice(1);
  for (const b of blocosP) {
    const m = b.match(/^(\d+)\.\s+([\s\S]*?)\*\*\s*$/m);
    if (!m) { falha(`${ficheiro}: pergunta mal formada: ${b.slice(0, 60)}`); continue; }
    const n = Number(m[1]);
    const texto = limpa(m[2]);
    const opcoes = {};
    for (const linha of b.split('\n')) {
      const mo = linha.match(/^- ([a-d])\)\s+(.*)$/);
      if (mo) {
        if (opcoes[mo[1]]) falha(`${ficheiro} P${n}: opção ${mo[1]} repetida`);
        opcoes[mo[1]] = limpa(mo[2]);
      }
    }
    perguntas.push({ n, texto, opcoes });
  }

  // 4. Soluções
  const solucoes = {};
  const blocosS = (sec['4'] || '').split(/^\*\*(?=\d+\.\s)/m).slice(1);
  for (const b of blocosS) {
    const linhas = b.split('\n').map((l) => l.replace(/\s+$/, ''));
    const m = linhas[0].match(/^(\d+)\.\s+([a-d])\)\s+(.*?)\*\*$/);
    if (!m) { falha(`${ficheiro}: solução mal formada: ${linhas[0].slice(0, 60)}`); continue; }
    const n = Number(m[1]);
    let ondeEsta = null, origem = null;
    const expl = [];
    for (const l of linhas.slice(1)) {
      const t = l.trim();
      if (!t || t === '---') continue;
      if (/^Errou\?/.test(t)) break;
      const mo = t.match(/^Onde está:\s*(.*)$/);
      if (mo) { ondeEsta = mo[1].trim(); continue; }
      const mr = t.match(/^\*\((.*)\)\*$/);
      if (mr) { origem = mr[1].trim(); continue; }
      expl.push(t);
    }
    solucoes[n] = { correta: m[2], textoCerto: m[3].trim(), ondeEsta, explicacao: expl.join(' '), origem };
  }

  const out = perguntas.map((p, i) => {
    const s = solucoes[p.n];
    if (p.n !== i + 1) falha(`${ficheiro}: numeração fora de ordem na pergunta ${p.n}`);
    if (Object.keys(p.opcoes).length !== 4) falha(`${ficheiro} P${p.n}: ${Object.keys(p.opcoes).length} opções`);
    if (!s) { falha(`${ficheiro} P${p.n}: sem solução`); return null; }
    if (!p.opcoes[s.correta]) falha(`${ficheiro} P${p.n}: letra certa ${s.correta} não existe`);
    else if (p.opcoes[s.correta] !== s.textoCerto) falha(`${ficheiro} P${p.n}: texto da solução diferente da opção ${s.correta}`);
    if (!s.ondeEsta) falha(`${ficheiro} P${p.n}: sem "Onde está"`);
    if (!s.explicacao) falha(`${ficheiro} P${p.n}: sem explicação`);
    if (!s.origem) falha(`${ficheiro} P${p.n}: sem origem`);
    return {
      id: `d${numero}-${p.n}`, dia: numero, lei,
      texto: p.texto, opcoes: p.opcoes, correta: s.correta,
      ondeEsta: s.ondeEsta, explicacao: s.explicacao, origem: s.origem,
    };
  }).filter(Boolean);
  if (Object.keys(solucoes).length !== perguntas.length) falha(`${ficheiro}: ${perguntas.length} perguntas mas ${Object.keys(solucoes).length} soluções`);

  const declarado = Number((md.match(/·\s*(\d+)\s*perguntas/) || [])[1]);
  if (declarado && declarado !== out.length) falha(`${ficheiro}: diz ${declarado} perguntas, encontrei ${out.length}`);

  return { numero, lei, tema, artigosLer, artigosFocar, perguntas: out };
}

function lerDia1(ficheiro) {
  const md = fs.readFileSync(path.join(FICHAS_DIR, ficheiro), 'utf8');
  const sec = seccoes(md);
  const tema = ((md.match(/^\*\*Tema:\*\*\s*(.+)$/m) || [])[1] || '').trim();
  const perguntas = [];
  for (const linha of (sec['3'] || '').split('\n')) {
    const m = linha.match(/^(\d+)\.\s+(.*?)\s*_+\s*$/);
    if (m) perguntas.push({ n: Number(m[1]), texto: m[2].trim() });
  }
  const sol = {};
  for (const linha of (sec['4'] || '').split('\n')) {
    const m = linha.match(/^(\d+)\.\s+(.*?)\s+—\s+\*\*art\.\s*(\d+)\.º\*\*\s*\((.*)\)\s*$/);
    if (m) sol[m[1]] = { leiNome: m[2].trim(), artigo: m[3], titulo: m[4].trim() };
  }
  const out = perguntas.map((p) => {
    const s = sol[p.n];
    if (!s) { falha(`${ficheiro} P${p.n}: sem solução`); return null; }
    return {
      id: `d1-${p.n}`, dia: 1, lei: 'TODAS', tipo: 'numero',
      texto: p.texto, correta: s.artigo,
      ondeEsta: `${s.leiNome}, Art. ${s.artigo}.º (${s.titulo})`,
    };
  }).filter(Boolean);
  const o_que_fazer = limpa(((sec['1'] || '').split('\n').slice(1).join('\n')));
  const estudar = limpa(((sec['2'] || '').split('\n').slice(1).join('\n')));
  return { numero: 1, lei: 'TODAS', tema, especial: 'indices', oQueFazer: o_que_fazer, oQueEstudar: estudar, perguntas: out };
}

// Só as partes que o site mostra (tabela dos dias e as 3 fases). O resto do plano não sai desta pasta.
function lerPlano() {
  const md = fs.readFileSync(path.join(LEIS_DIR, 'PLANO_ESTUDO.md'), 'utf8');
  return md.split(/^(?=## )/m).filter((p) => /^## (2|4|5)\./.test(p)).join('\n');
}

// --- principal ---
const ficheiros = fs.readdirSync(FICHAS_DIR).filter((f) => /^Dia_\d+_.+\.md$/.test(f)).sort();
const dias = [];
for (const f of ficheiros) {
  const m = f.match(/^Dia_(\d+)_(.+)\.md$/);
  const numero = Number(m[1]);
  if (numero === 1) { dias.push(lerDia1(f)); continue; }
  const lei = LEI_POR_FICHEIRO[m[2]];
  if (!lei) { falha(`${f}: lei desconhecida ${m[2]}`); continue; }
  dias.push(lerFichaNormal(f, numero, lei));
}
dias.push({ numero: 38, lei: 'TODAS', tema: 'Revisão: refazer as perguntas erradas', especial: 'revisao', perguntas: [] });

// Validação final
const normais = dias.filter((d) => d.numero >= 2 && d.numero <= 37);
const total = normais.reduce((s, d) => s + d.perguntas.length, 0);
const dia1 = dias.find((d) => d.numero === 1);
if (dias.length - 1 !== 37) falha(`Esperava 37 dias com ficha, encontrei ${dias.length - 1}`);
if (total !== 440) falha(`Esperava 440 perguntas (Dia 2–37), encontrei ${total}`);
if (!dia1 || dia1.perguntas.length !== 16) falha(`Dia 1: esperava 16 perguntas, encontrei ${dia1 ? dia1.perguntas.length : 0}`);

if (erros.length) {
  console.error('PARAR — os dados não batem certo:\n- ' + erros.join('\n- '));
  process.exit(1);
}

const data = { geradoEm: new Date().toISOString(), dias, plano: lerPlano() };
fs.writeFileSync(OUT_JSON, JSON.stringify(data, null, 2));
fs.writeFileSync(OUT_JS, '// Gerado por build/converter.js — não editar à mão.\nwindow.DADOS = ' + JSON.stringify(data) + ';\n');
console.log(`OK: ${dias.length - 1} dias com ficha, ${total} perguntas (Dia 2–37), Dia 1 com ${dia1.perguntas.length} perguntas de número.`);
