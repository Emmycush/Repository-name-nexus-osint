import {requireUser} from "../_auth.js";

function esc(v){
  return String(v??"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

function confidenceBand(value){
  const n=Number(value||0);
  if(n>=80) return "HIGH";
  if(n>=50) return "MEDIUM";
  return "LOW";
}

export async function onRequestGet(context){
  const user=await requireUser(context);
  if(!user) return new Response("Authentication required",{status:401});
  if(!context.env?.DB) return new Response("Database is not configured.",{status:503});

  const id=context.params?.id;

  const inv=await context.env.DB.prepare(`
    SELECT
      i.id,i.case_id,i.target,i.target_type,i.status,i.created_at,
      c.title AS case_title
    FROM investigations i
    LEFT JOIN cases c ON c.id=i.case_id
    WHERE i.id=? AND i.user_id=?
  `).bind(id,user.id).first();

  if(!inv) return new Response("Investigation not found",{status:404});

  const rows=await context.env.DB.prepare(`
    SELECT
      id,label,value,source,source_url,confidence,analyst_note,collected_at
    FROM findings
    WHERE investigation_id=?
    ORDER BY confidence DESC,collected_at
  `).bind(id).all();

  const findings=rows.results||[];

  const links=await context.env.DB.prepare(`
    SELECT
      fl.id,
      fl.finding_id,
      fl.linked_finding_id,
      fl.relation,
      fl.created_at,
      a.label AS finding_label,
      a.value AS finding_value,
      b.label AS linked_label,
      b.value AS linked_value
    FROM finding_links fl
    JOIN findings a ON a.id=fl.finding_id
    JOIN findings b ON b.id=fl.linked_finding_id
    WHERE a.investigation_id=?
    ORDER BY fl.created_at
  `).bind(id).all();

  const relationships=links.results||[];

  const high=findings.filter(f=>Number(f.confidence||0)>=80).length;
  const medium=findings.filter(f=>{
    const n=Number(f.confidence||0);
    return n>=50 && n<80;
  }).length;
  const low=findings.filter(f=>Number(f.confidence||0)<50).length;

  const averageConfidence=findings.length
    ? Math.round(findings.reduce((sum,f)=>sum+Number(f.confidence||0),0)/findings.length)
    : 0;

  const assessment=
    !findings.length
      ? "No evidence was collected for this investigation."
      : averageConfidence>=80
        ? "The collected evidence has a high overall confidence level. Analysts should still independently verify important claims."
        : averageConfidence>=50
          ? "The investigation contains a mixed-confidence evidence set. Additional verification is recommended before drawing strong conclusions."
          : "The investigation currently contains mostly low-confidence evidence. Further collection and independent verification are recommended.";

  const body=findings.map(f=>{
    const confidence=Number(f.confidence||0);
    const band=confidenceBand(confidence);

    return `
      <article class="finding">
        <header>
          <div>
            <strong>${esc(f.label)}</strong>
            <span class="band band-${band.toLowerCase()}">${band}</span>
          </div>
          <span class="confidence">${confidence}% confidence</span>
        </header>

        <p class="finding-value">${esc(f.value)}</p>

        <div class="finding-meta">
          <span>Source: ${esc(f.source||"Unknown")}</span>
          <span>Collected: ${esc(f.collected_at||"Unknown")}</span>
        </div>

        ${f.analyst_note
          ? `<div class="analyst-note"><b>Analyst note</b><p>${esc(f.analyst_note)}</p></div>`
          : ""}

        ${f.source_url
          ? `<a class="source-link" href="${esc(f.source_url)}" rel="noreferrer">${esc(f.source_url)}</a>`
          : ""}
      </article>
    `;
  }).join("");

  const relationshipBody=relationships.map(r=>`
    <article class="relationship">
      <div class="relationship-node">
        <strong>${esc(r.finding_label)}</strong>
        <span>${esc(r.finding_value)}</span>
      </div>

      <div class="relationship-arrow">
        <span>${esc(r.relation)}</span>
        →
      </div>

      <div class="relationship-node">
        <strong>${esc(r.linked_label)}</strong>
        <span>${esc(r.linked_value)}</span>
      </div>
    </article>
  `).join("");

  const html=`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NEXUS Report ${esc(inv.id)}</title>

<style>
  *{box-sizing:border-box}

  body{
    margin:0;
    background:#080c12;
    color:#dce8f1;
    font:14px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
  }

  main{
    max-width:1050px;
    margin:auto;
    padding:40px 22px 60px;
  }

  .hero{
    border:1px solid #22394a;
    background:#0c151e;
    padding:28px;
    border-radius:16px;
  }

  h1{
    margin:0;
    color:#49dfff;
    font-size:28px;
  }

  h2{
    margin:32px 0 14px;
    color:#e8f8ff;
  }

  .meta{
    color:#7890a1;
    line-height:1.8;
    margin-top:14px;
  }

  .assessment{
    margin-top:20px;
    border-left:4px solid #39d9ff;
    background:#0b1822;
    padding:16px 18px;
    border-radius:8px;
    color:#c8d8e4;
    line-height:1.6;
  }

  .stats{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:12px;
    margin-top:20px;
  }

  .stat{
    border:1px solid #203442;
    background:#0a121a;
    padding:16px;
    border-radius:10px;
  }

  .stat strong{
    display:block;
    font-size:24px;
    color:#49dfff;
  }

  .stat span{
    color:#718697;
    font-size:12px;
    text-transform:uppercase;
  }

  .finding{
    border:1px solid #1d3445;
    background:#0a121a;
    padding:18px;
    border-radius:12px;
    margin:12px 0;
  }

  .finding header{
    display:flex;
    justify-content:space-between;
    gap:15px;
    align-items:center;
  }

  .finding header strong{
    color:#e8f8ff;
    font-size:16px;
  }

  .confidence{
    color:#6ce6a0;
    font-size:12px;
    white-space:nowrap;
  }

  .band{
    display:inline-block;
    margin-left:8px;
    padding:3px 7px;
    border-radius:5px;
    font-size:10px;
    font-weight:700;
  }

  .band-high{
    color:#6ce6a0;
    border:1px solid #286347;
  }

  .band-medium{
    color:#ffd447;
    border:1px solid #685a24;
  }

  .band-low{
    color:#ff7896;
    border:1px solid #6b2d3e;
  }

  .finding-value{
    word-break:break-word;
    margin:14px 0;
    color:#dce8f1;
  }

  .finding-meta{
    display:flex;
    flex-wrap:wrap;
    gap:12px;
    color:#718697;
    font-size:12px;
  }

  .analyst-note{
    margin-top:14px;
    padding:12px 14px;
    border-left:3px solid #39d9ff;
    background:#0c1821;
    color:#a8bccb;
  }

  .analyst-note p{
    margin:7px 0 0;
    white-space:pre-wrap;
  }

  .source-link{
    display:block;
    color:#66dfff;
    word-break:break-all;
    margin-top:12px;
  }

  .relationship{
    display:grid;
    grid-template-columns:1fr auto 1fr;
    gap:15px;
    align-items:center;
    border:1px solid #1d3445;
    background:#0a121a;
    padding:14px;
    border-radius:10px;
    margin:10px 0;
  }

  .relationship-node{
    min-width:0;
  }

  .relationship-node strong{
    display:block;
    color:#e8f8ff;
  }

  .relationship-node span{
    display:block;
    color:#7890a1;
    word-break:break-word;
    margin-top:4px;
  }

  .relationship-arrow{
    color:#39d9ff;
    text-align:center;
    font-size:12px;
    font-weight:700;
  }

  .print{
    margin:18px 0;
    padding:10px 15px;
    border:1px solid #2b5268;
    background:#0c1821;
    color:#dce8f1;
    border-radius:8px;
    cursor:pointer;
  }

  .empty{
    color:#718697;
    padding:14px 0;
  }

  .footer{
    color:#718697;
    margin-top:32px;
    line-height:1.6;
  }

  @media(max-width:700px){
    main{padding:22px 14px 45px}
    .stats{grid-template-columns:repeat(2,1fr)}
    .relationship{grid-template-columns:1fr}
    .relationship-arrow{transform:none}
    .finding header{align-items:flex-start;flex-direction:column}
  }

  @media print{
    body{
      background:white;
      color:#111;
    }

    main{
      max-width:none;
      padding:20px;
    }

    .hero,.finding,.stat,.relationship{
      background:white;
      color:#111;
      border-color:#ccc;
    }

    h1,h2,.finding header strong,.relationship-node strong{
      color:#111;
    }

    .assessment,.analyst-note{
      background:white;
      color:#333;
      border-color:#555;
    }

    .print{
      display:none;
    }

    .source-link{
      color:#0645ad;
    }
  }
</style>
</head>

<body>
<main>

<section class="hero">
  <h1>NEXUS // OSINT — Advanced Investigation Report</h1>

  <div class="meta">
    <b>Case:</b> ${esc(inv.case_title||"Unassigned")}<br>
    <b>Target:</b> ${esc(inv.target)}<br>
    <b>Type:</b> ${esc(inv.target_type)}<br>
    <b>Status:</b> ${esc(inv.status)}<br>
    <b>Investigation:</b> ${esc(inv.id)}<br>
    <b>Created:</b> ${esc(inv.created_at)}
  </div>

  <div class="assessment">
    <b>Executive assessment</b><br>
    ${esc(assessment)}
  </div>
</section>

<div class="stats">
  <div class="stat">
    <strong>${findings.length}</strong>
    <span>Total findings</span>
  </div>

  <div class="stat">
    <strong>${averageConfidence}%</strong>
    <span>Average confidence</span>
  </div>

  <div class="stat">
    <strong>${high}</strong>
    <span>High confidence</span>
  </div>

  <div class="stat">
    <strong>${relationships.length}</strong>
    <span>Relationships</span>
  </div>
</div>

<button class="print" onclick="window.print()">Print / Save PDF</button>

<h2>Evidence</h2>

${body||'<p class="empty">No findings.</p>'}

<h2>Evidence Relationships</h2>

${relationshipBody||'<p class="empty">No evidence relationships have been recorded.</p>'}

<div class="footer">
  Public-source research report. Findings should be independently verified before relying on them.
</div>

</main>
</body>
</html>`;

  return new Response(html,{
    headers:{"content-type":"text/html;charset=UTF-8"}
  });
}
