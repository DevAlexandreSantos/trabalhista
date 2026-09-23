/* CORE-START */
const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;

const INSS_FAIXAS = [[1621.00, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]];
const IR_FAIXAS = [
  [2428.80, 0, 0], [2826.65, 0.075, 182.16], [3751.05, 0.15, 394.16],
  [4664.68, 0.225, 675.49], [Infinity, 0.275, 908.73]
];
const DEP = 189.59, SIMPL = 607.20;

function inss(base) {
  let prev = 0, tot = 0;
  for (const [lim, al] of INSS_FAIXAS) {
    if (base > prev) tot += (Math.min(base, lim) - prev) * al;
    prev = lim;
  }
  return r2(tot);
}

function irrf(bruto, inssVal, deps) {
  const legal = inssVal + deps * DEP;
  const ded = Math.max(legal, SIMPL);
  const base = Math.max(0, bruto - ded);
  let imposto = 0;
  for (const [lim, al, pd] of IR_FAIXAS) {
    if (base <= lim) { imposto = Math.max(0, base * al - pd); break; }
  }
  let reducao = 0;
  if (bruto <= 5000) reducao = Math.min(imposto, 312.89);
  else if (bruto <= 7350) reducao = Math.max(0, 978.62 - 0.133145 * bruto);
  return { base: r2(base), imposto: r2(imposto), reducao: r2(reducao), final: r2(Math.max(0, imposto - reducao)) };
}

function addMonths(d, m) {
  const r = new Date(d.getFullYear(), d.getMonth() + m, d.getDate());
  if (r.getDate() !== d.getDate()) r.setDate(0);
  return r;
}
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function diffDays(a, b) { return Math.round((b - a) / 86400000); }

// Meses (avos) entre start e end, contando o último dia; fração de 15 dias ou mais vale 1 mês.
function avos(start, end) {
  const e = addDays(end, 1);
  let m = (e.getFullYear() - start.getFullYear()) * 12 + (e.getMonth() - start.getMonth());
  if (addMonths(start, m) > e) m--;
  const rem = diffDays(addMonths(start, m), e);
  if (rem >= 15) m++;
  return Math.max(0, m);
}
function fullYears(adm, end) {
  let y = end.getFullYear() - adm.getFullYear();
  if (addMonths(adm, y * 12) > end) y--;
  return Math.max(0, y);
}
/* CORE-END */

const $ = id => document.getElementById(id);
const n = id => parseFloat($(id).value) || 0;
const ni = id => Math.max(0, Math.floor(n(id)));
const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pctf = v => (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
const num = v => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
function pd(s) { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
const fdate = d => d.toLocaleDateString('pt-BR');

/* ---------- Horas extras ---------- */
function calcHE() {
  const sal = n('he-sal'), jor = n('he-jor'), h1 = n('he-h1'), p1 = n('he-p1'), h2 = n('he-h2'), p2 = n('he-p2');
  const du = Math.max(1, n('he-du')), df = n('he-df'), deps = ni('he-dep');
  if (sal <= 0) return { empty: 'Informe o salário bruto para calcular as horas extras.' };
  const divisor = jor * 5;
  const vh = sal / divisor;
  const he1 = r2(h1 * vh * (1 + p1 / 100));
  const he2 = r2(h2 * vh * (1 + p2 / 100));
  const dsr = r2((he1 + he2) / du * df);
  const bruto = r2(sal + he1 + he2 + dsr);
  const i = inss(bruto);
  const ir = irrf(bruto, i, deps);
  return {
    title: 'Demonstrativo de horas extras',
    rows: [
      { d: 'Salário base', ref: '30 d', p: r2(sal) },
      { d: `Horas extras ${num(p1)}%`, sub: 'Dias úteis', ref: `${num(h1)} h`, p: he1 },
      { d: `Horas extras ${num(p2)}%`, sub: 'Domingos e feriados', ref: `${num(h2)} h`, p: he2 },
      { d: 'DSR sobre horas extras', ref: `${df}/${du}`, p: dsr },
      { d: 'INSS', ref: pctf(i / bruto), x: i },
      { d: 'IRRF', ref: ir.reducao > 0 && ir.final === 0 ? 'isento' : (bruto ? pctf(ir.final / bruto) : ''), x: ir.final }
    ],
    extras: [
      { l: 'Valor da hora normal', v: brl(r2(vh)), h: `${brl(sal)} ÷ ${divisor} horas` },
      { l: 'FGTS do mês (8%, pago pelo empregador)', v: brl(r2(bruto * 0.08)) }
    ],
    alerts: [],
    notes: [
      `Valor da hora = salário ÷ ${divisor} (jornada de ${jor} h por semana × 5).`,
      'Hora extra = valor da hora × (1 + adicional). O DSR é o total das horas extras ÷ dias úteis × domingos e feriados.',
      'INSS e IRRF incidem sobre salário + horas extras + DSR.',
      ir.reducao > 0 ? `A redução do IR de 2026 abateu ${brl(ir.reducao)} do imposto (${brl(ir.imposto)} pela tabela).` : 'Neste valor não há redução do IR de 2026.'
    ]
  };
}

/* ---------- Férias ---------- */
function calcFerias() {
  const sal = n('fe-sal'), vari = n('fe-var'), faltas = ni('fe-falt'), abono = $('fe-abono').checked, deps = ni('fe-dep');
  if (sal <= 0) return { empty: 'Informe o salário bruto para calcular as férias.' };
  const rem = sal + vari;
  const dias = faltas <= 5 ? 30 : faltas <= 14 ? 24 : faltas <= 23 ? 18 : faltas <= 32 ? 12 : 0;
  if (dias === 0) return { empty: 'Com mais de 32 faltas injustificadas no período aquisitivo, o direito às férias é perdido.' };
  const abonoDias = abono ? Math.floor(dias / 3) : 0;
  const gozo = dias - abonoDias;
  const ferias = r2(rem / 30 * gozo);
  const terco = r2(ferias / 3);
  const abonoV = r2(rem / 30 * abonoDias);
  const abono3 = r2(abonoV / 3);
  const trib = r2(ferias + terco);
  const i = inss(trib);
  const ir = irrf(trib, i, deps);
  return {
    title: 'Demonstrativo de férias',
    rows: [
      { d: 'Férias', ref: `${gozo} d`, p: ferias },
      { d: '1/3 constitucional', ref: '', p: terco },
      { d: 'Abono pecuniário', sub: 'Sem INSS e IR', ref: `${abonoDias} d`, p: abonoV },
      { d: '1/3 sobre o abono', sub: 'Sem INSS e IR', ref: '', p: abono3 },
      { d: 'INSS', ref: trib ? pctf(i / trib) : '', x: i },
      { d: 'IRRF', ref: ir.reducao > 0 && ir.final === 0 ? 'isento' : (trib ? pctf(ir.final / trib) : ''), x: ir.final }
    ],
    extras: [
      { l: 'Dias de direito', v: `${dias} dias`, h: faltas ? `${faltas} falta(s) injustificada(s)` : 'Sem faltas' },
      { l: 'Base de cálculo (salário + média)', v: brl(r2(rem)) }
    ],
    alerts: [
      'O pagamento das férias deve ser feito até 2 dias antes do início do descanso.',
      'O IR das férias pode variar conforme a folha, porque a redução de 2026 considera todos os rendimentos do mês.'
    ],
    notes: [
      `Férias = (salário + média) ÷ 30 × ${gozo} dias, mais 1/3 constitucional.`,
      abonoDias ? `Abono pecuniário: ${abonoDias} dias vendidos, mais 1/3 (indenizatório, sem INSS e IR).` : 'Sem venda de dias.',
      'INSS e IR incidem sobre férias + 1/3 dos dias gozados, calculados separadamente do salário do mês.'
    ]
  };
}

/* ---------- Rescisão ---------- */
function updateAvisoOptions() {
  const tipo = $('re-tipo').value, sel = $('re-aviso');
  const cur = sel.value;
  let opts;
  if (tipo === 'justa') opts = [['none', 'Não há aviso prévio na justa causa']];
  else if (tipo === 'pedido') opts = [['trab', 'Vou cumprir o aviso trabalhando'], ['ind', 'Não vou cumprir (a empresa desconta)']];
  else opts = [['ind', 'Indenizado (dispensado de trabalhar)'], ['trab', 'Trabalhado']];
  sel.innerHTML = opts.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('');
  if (opts.some(o => o[0] === cur)) sel.value = cur;
  sel.disabled = tipo === 'justa';
}

function calcRescisao() {
  const tipo = $('re-tipo').value, av = $('re-aviso').value;
  const adm = pd($('re-adm').value), des = pd($('re-des').value);
  const sal = n('re-sal'), vari = n('re-var'), venc = Math.min(2, ni('re-venc')), deps = ni('re-dep'), fgtsInf = n('re-fgts');
  if (!adm || !des || sal <= 0) return { empty: 'Preencha as datas de admissão e desligamento e o salário para ver a rescisão.' };
  if (des < adm) return { empty: 'A data de desligamento precisa ser posterior à admissão.' };

  const rem = sal + vari;
  const sem = tipo === 'sem', pedido = tipo === 'pedido', acordo = tipo === 'acordo', jc = tipo === 'justa';
  const anos = fullYears(adm, des);
  const avisoDias = Math.min(90, 30 + 3 * anos);
  const avisoInd = av === 'ind' && !jc;
  const proj = (sem && avisoInd) ? addDays(des, avisoDias) : des;

  // Saldo de salário
  const ultimoDia = new Date(des.getFullYear(), des.getMonth() + 1, 0).getDate();
  const mesmoMes = adm.getFullYear() === des.getFullYear() && adm.getMonth() === des.getMonth();
  let diasSaldo = des.getDate() === ultimoDia ? 30 : Math.min(des.getDate(), 30);
  if (mesmoMes) diasSaldo = Math.min(30, des.getDate() - adm.getDate() + 1);
  const saldo = r2(sal / 30 * diasSaldo);

  // Aviso prévio
  const avisoVal = (avisoInd && (sem || acordo)) ? r2(rem / 30 * avisoDias * (acordo ? 0.5 : 1)) : 0;
  const descAviso = (pedido && avisoInd) ? r2(rem) : 0;

  // 13º proporcional
  let avos13 = 0, v13 = 0;
  if (!jc) {
    const ini = new Date(proj.getFullYear(), 0, 1);
    avos13 = avos(adm > ini ? adm : ini, proj);
    v13 = r2(rem / 12 * avos13);
  }

  // Férias
  const fv = r2(rem * venc), fv3 = r2(fv / 3);
  let avosF = 0, fp = 0, fp3 = 0;
  if (!jc) {
    const ini = addMonths(adm, fullYears(adm, proj) * 12);
    avosF = Math.min(12, avos(ini, proj));
    fp = r2(rem / 12 * avosF);
    fp3 = r2(fp / 3);
  }

  // Impostos
  const inssS = inss(saldo), irS = irrf(saldo, inssS, deps).final;
  const inss13 = inss(v13), ir13 = v13 ? irrf(v13, inss13, deps).final : 0;

  // FGTS
  const depRes = r2(0.08 * (saldo + v13 + avisoVal));
  const meses = Math.max(0, Math.floor(diffDays(adm, des) / 30.4375));
  const saldoFGTS = fgtsInf > 0 ? fgtsInf : r2(0.08 * sal * meses);
  const baseFGTS = r2(saldoFGTS + depRes);
  const pctMulta = sem ? 0.4 : acordo ? 0.2 : 0;
  const multa = r2(baseFGTS * pctMulta);
  const saque = sem ? r2(baseFGTS + multa) : acordo ? r2(baseFGTS * 0.8 + multa) : 0;

  const extras = [];
  if (pctMulta) {
    extras.push({ l: `Multa do FGTS (${pctf(pctMulta)})`, v: brl(multa), h: 'Depositada na conta do FGTS pela empresa' });
    extras.push({ l: acordo ? 'Saque do FGTS liberado (80% + multa)' : 'Saque do FGTS liberado', v: brl(saque), h: fgtsInf > 0 ? 'Com base no saldo informado' : 'Estimativa, informe o saldo para melhorar' });
  } else {
    extras.push({ l: 'FGTS', v: 'Sem multa e sem saque', h: 'Nesta modalidade o saldo fica na conta' });
  }
  extras.push({ l: 'Tempo de serviço', v: `${anos} ano(s)`, h: `Aviso prévio de ${avisoDias} dias` });

  const alerts = ['A empresa tem até 10 dias corridos após o fim do contrato para pagar a rescisão.'];
  if (sem) alerts.push('Quem é demitido sem justa causa pode ter direito ao seguro-desemprego. Confira as regras no gov.br.');
  if (acordo) alerts.push('No acordo não há seguro-desemprego, e o aviso indenizado é pago pela metade.');
  if (venc > 0) alerts.push('Férias vencidas há mais de 12 meses do período concessivo são devidas em dobro. Este cálculo não considera a dobra.');
  if (!(fgtsInf > 0) && pctMulta) alerts.push('Sem o saldo do FGTS informado, a multa é uma estimativa.');

  const notes = [
    `Saldo de salário: ${diasSaldo} dias trabalhados no último mês.`,
    avisoVal ? `Aviso prévio indenizado de ${avisoDias} dias (30 dias + 3 por ano completo, limite de 90).${acordo ? ' Pago pela metade no acordo.' : ''}` : (descAviso ? 'Aviso não cumprido: a empresa pode descontar o valor de 30 dias.' : 'Sem aviso indenizado no cálculo.'),
    (sem && avisoInd) ? `O aviso indenizado conta como tempo de serviço: fim projetado em ${fdate(proj)}, o que aumenta o 13º e as férias proporcionais.` : 'Sem projeção do aviso no tempo de serviço.',
    jc ? 'Na justa causa não há 13º proporcional, férias proporcionais, aviso nem multa do FGTS.' : `13º proporcional: ${avos13}/12 (meses com 15 dias ou mais trabalhados). Férias proporcionais: ${avosF}/12.`,
    'Aviso indenizado e férias indenizadas não pagam INSS nem IR. O 13º tem INSS e IR próprios, calculados à parte.',
    'A multa do FGTS incide sobre o saldo mais os depósitos da rescisão (saldo de salário, 13º e aviso indenizado).'
  ];

  return {
    title: 'Termo de rescisão (estimativa)',
    rows: [
      { d: 'Saldo de salário', ref: `${diasSaldo} d`, p: saldo },
      { d: 'Aviso prévio indenizado', sub: 'Sem INSS e IR', ref: `${avisoDias} d${acordo ? ' (50%)' : ''}`, p: avisoVal },
      { d: '13º salário proporcional', ref: `${avos13}/12`, p: v13 },
      { d: 'Férias vencidas', sub: 'Sem INSS e IR', ref: `${venc} per.`, p: fv },
      { d: '1/3 sobre férias vencidas', ref: '', p: fv3 },
      { d: 'Férias proporcionais', sub: 'Sem INSS e IR', ref: `${avosF}/12`, p: fp },
      { d: '1/3 sobre férias proporcionais', ref: '', p: fp3 },
      { d: 'INSS sobre saldo de salário', ref: '', x: inssS },
      { d: 'IRRF sobre saldo de salário', ref: '', x: irS },
      { d: 'INSS sobre 13º', ref: '', x: inss13 },
      { d: 'IRRF sobre 13º', ref: '', x: ir13 },
      { d: 'Aviso prévio não cumprido', ref: '', x: descAviso }
    ],
    extras, alerts, notes
  };
}

/* ---------- Renderização ---------- */
let lastNet = null;
function render(cfg) {
  const out = $('out');
  if (cfg.empty) { out.innerHTML = `<div class="slip"><p class="empty">${cfg.empty}</p></div>`; lastNet = null; return; }
  let tp = 0, tx = 0;
  const body = cfg.rows.filter(r => r.p || r.x).map(r => {
    tp += r.p || 0; tx += r.x || 0;
    return `<tr><td>${r.d}${r.sub ? `<small>${r.sub}</small>` : ''}</td><td class="ref">${r.ref || ''}</td>` +
      `<td class="n pos">${r.p ? brl(r.p) : ''}</td><td class="n neg">${r.x ? brl(r.x) : ''}</td></tr>`;
  }).join('');
  tp = r2(tp); tx = r2(tx);
  const net = r2(tp - tx);
  const flash = lastNet !== null && lastNet !== net ? ' flash' : '';
  lastNet = net;
  const extras = cfg.extras && cfg.extras.length
    ? `<dl class="extras">${cfg.extras.map(e => `<div><dt>${e.l}</dt><dd>${e.v}${e.h ? `<span class="hint">${e.h}</span>` : ''}</dd></div>`).join('')}</dl>` : '';
  const alerts = cfg.alerts && cfg.alerts.length ? `<ul class="alerts">${cfg.alerts.map(a => `<li>${a}</li>`).join('')}</ul>` : '';
  const notes = cfg.notes && cfg.notes.length ? `<details><summary>Como calculamos</summary><ul>${cfg.notes.map(a => `<li>${a}</li>`).join('')}</ul></details>` : '';
  out.innerHTML = `
    <div class="slip">
      <header class="slip-h"><h2>${cfg.title}</h2><span>Valores em reais</span></header>
      <div class="scroll"><table>
        <thead><tr><th>Descrição</th><th>Ref.</th><th class="n">Proventos</th><th class="n">Descontos</th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot><tr><td colspan="2">Totais</td><td class="n">${brl(tp)}</td><td class="n">${brl(tx)}</td></tr></tfoot>
      </table></div>
      <div class="liquido${flash}"><span>${net < 0 ? 'Saldo a devolver' : 'Líquido a receber'}</span><strong>${brl(Math.abs(net))}</strong></div>
      ${alerts}${extras}${notes}
    </div>`;
}

/* ---------- Abas ---------- */
const TABS = { he: calcHE, fe: calcFerias, re: calcRescisao };
let current = 'he';
function recalc() {
  if (current === 're') updateAvisoOptions();
  render(TABS[current]());
}
function setTab(t) {
  current = t; lastNet = null;
  document.querySelectorAll('.tab').forEach(b => {
    const on = b.dataset.tab === t;
    b.setAttribute('aria-selected', on);
    b.tabIndex = on ? 0 : -1;
  });
  ['he', 'fe', 're'].forEach(k => { $('f-' + k).hidden = k !== t; });
  recalc();
}
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
document.querySelector('.tabs').addEventListener('keydown', e => {
  const order = ['he', 'fe', 're'];
  let i = order.indexOf(current);
  if (e.key === 'ArrowRight') i = (i + 1) % 3; else if (e.key === 'ArrowLeft') i = (i + 2) % 3; else return;
  setTab(order[i]); $('t-' + order[i]).focus();
});
document.querySelector('.grid').addEventListener('input', recalc);
document.querySelector('.grid').addEventListener('change', recalc);
updateAvisoOptions();
setTab('he');