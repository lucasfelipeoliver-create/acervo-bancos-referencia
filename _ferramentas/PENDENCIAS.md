# Pendências do Códice — deixadas em 17/09/2026

Anotado por uma sessão do Claude na nuvem, para ser retomado pelo Claude do
computador pessoal, que é quem alcança o gerador e a rede.

O que a sessão da nuvem **não** alcançava, e por isso parou aqui:

- `build_buscador_v5.py` e `publicar_pages.py` — moram no computador, não no repositório.
- A rede: o proxy do ambiente da nuvem nega `drive.google.com` e `der.pr.gov.br`
  (403 no CONNECT). Só `api.github.com`, `raw.githubusercontent.com`,
  `www.googleapis.com` e os registries passavam.

---

## LEIA PRIMEIRO — o build sobrescreve tudo isto

Todo o trabalho desta sessão está dentro do `index.html` publicado, que é
**gerado**. O cabeçalho do `sw.js` diz "gerado por publicar_pages.py", e há
referências a `build_buscador_v5.py`. Se o gerador rodar sem adotar as mudanças
abaixo, elas somem no próximo publish.

O que precisa ser transplantado para o gerador está nos itens **2** e **3**.

### Armadilha técnica ao editar o index.html

O arquivo é **CRLF** e o `.gitattributes` tem `* -text`, então o git guarda os
bytes como estão. Abrir com Python em modo texto e regravar converte tudo para
LF e o diff vira reescrita das ~5.900 linhas. Usar `newline=''` na leitura **e**
na escrita, ou modo binário. Aconteceu nesta sessão e teve de ser desfeito.

---

## 1. ALTA — publicar os 6 manuais do DER_PR no acervo

**Por que importa.** O DER_PR tem 1.290 códigos e **zero critério de medição** —
o pilar central do app ("critério, escopo e preço") está vazio para o banco
inteiro. Não é falha de mineração: a fonte nunca entrou em `documentos/`. Além
disso, 579 códigos têm vínculo de projeto-tipo apontando para esses PDFs.

**Estado atual.** Paliativo já aplicado (commit `4f75717`): os links abrem os
arquivos no Google Drive em vez de dar 404. Funciona, mas o Drive não honra
`#page=N` — o app declara "ROLAR ATÉ ELA" — e sem o PDF local não dá para
renderizar prancha nenhuma.

**O que fazer.** Baixar os 6 arquivos e colocá-los em
`documentos/DER_PR/Manuais/`, com exatamente estes nomes:

| Arquivo | Bytes | ID no Drive |
|---|---|---|
| `MESR_TOMO_I_TERRAPLENAGEM.pdf` | 6.321.469 | `1s0crVBZj3MPww_dhiuxRzpX4E1hYeEZe` |
| `MESR_TOMO_II_DRENAGEM.pdf` | 4.385.201 | `1Pp_8SqB-v_TYqOoshNw6sIN3Hf13xc2u` |
| `MESR_TOMO_III_PAVIMENTACAO.pdf` | 13.055.548 | `1Isu4SIShMvICeyG5vE6VBmDzHXBF89jz` |
| `MESR_TOMO_V_OAE.pdf` | 9.139.340 | `1vncXu6BLSAUgr7l7eJGAvE68t_2T3AAN` |
| `MESR_TOMO_VI_SINALIZACAO.pdf` | 5.156.640 | `1BKuBsw6lcbE-4UtQgrymYTWvY5OwyHOA` |
| `album_tipo_sinalizacao_seguranca_viaria.pdf` | 44.164.384 | `1kzEm0U7H562c7Ash77IT1cY8rhXcLm6z` |

Todos na mesma pasta do Drive, id `1BzvXI4-Eykz5-9qQxhAdPR-yJPD7xzgD`.

**Confira antes de comitar.** Essa pasta tem um `_MANIFESTO.json`
(id `1DeTzqRnAS1NdS7ef53FCtV4twLzVkUwY`) com, para cada arquivo, a **URL oficial
no site do DER/PR** e o **SHA-256**. Baixe de onde for mais fácil (Drive ou a URL
oficial) e confira o hash contra esse manifesto antes de publicar — ele existe
exatamente para isso.

`MESR_TOMO_IV_OBRAS_COMPLEMENTARES.pdf` também está na pasta, mas **nenhum código
aponta para ele**; só inclua se quiser o acervo completo.

**Depois de publicar.** Rodar o build. Com o item 2 implementado, o campo
`publicado` vira 1 sozinho, os links voltam para a rota pública com `#page=N`, e
as páginas de projeto-tipo passam a poder virar prancha (`PRANCHAS`).

Atenção ao tamanho: são ~82 MB num repositório que já tem 1,3 GB.

---

## 2. ALTA — o gerador precisa calcular o campo `publicado` de `PDFS`

**O defeito que isto conserta.** `rotaSite()` montava a URL pública a partir do
caminho e devolvia **para qualquer caminho**, sem nunca conferir se o documento
tinha sido publicado. Resultado medido: 5.759 vínculos do DER_PR entregues como
link limpo, respondendo **HTTP 404** no clique. Como essa rota era testada antes
do id do Drive, o fallback para o Drive e a declaração "DOCUMENTO NÃO
LOCALIZADO" — ambos já escritos no app — eram código inalcançável.

**O que o commit `4f75717` fez no artefato publicado:**

- `PDFS[i]` passou a ter 5 campos:
  `[caminho, driveId, existeLocal, supersedidoPor, publicado]`
- `publicado` = 1 se o arquivo existe em `documentos/`, senão 0
  (medido: 356 publicados, 31 ausentes de 387 indexados)
- em `linkDoc()`:

```js
var publicado=(p.length>4)?p[4]:1;
var pub=publicado?rotaSite(p[0]):null;
```

O padrão quando o campo não existe é `1`, de propósito: um build antigo que não
emita o campo continua se comportando como antes, sem mudar nada por engano.

**O que o gerador precisa fazer:** emitir esse 5º campo a partir do que existe
de fato em `documentos/` na hora do build. Sem isso, o próximo publish volta a
prometer rota pública para arquivo ausente.

Os outros 25 PDFs ausentes (DER_ES, GOINFRA_GO, SANEPAR_PR) não têm nenhum
vínculo apontando para eles — passam a declarar, sem impacto para o usuário.

---

## 3. ALTA — adotar a realidade aumentada das pranchas no build

Três commits (`8b6b66f`, `83676a8`, `9b84dee`) puseram no app o pino que abre o
modelo 3D do dispositivo direto da prancha. Tudo vive no `index.html` gerado.

**A ferramenta já está no repositório:** `_ferramentas/extrai_qr_ra.py`. Ela lê o
QR impresso nas pranchas do Caderno de Drenagem do DER-MG a partir do **PDF de
origem** (no render de 2400px o QR fica com ~90px e o webp borra os módulos — o
detector não lê nenhum dos 306; no PDF o QR está embutido em 300×300 e lê todos)
e devolve, por prancha, o uuid do modelo no 3D Warehouse e a caixa do QR
normalizada em fração da página.

Uso:

```
python3 _ferramentas/extrai_qr_ra.py <raiz-dos-documentos> <pranchas.json> [saida.js]
```

A saída atual está em `_ferramentas/ra3d.js` (49 pranchas) e é embutida no
`index.html` como `var RA3D_BASE` + `var RA3D`.

**O que precisa ser transplantado para o gerador**, além de chamar a ferramenta:

- o bloco `RA3D_BASE`/`RA3D` + a função `ra3dDa(p)`
- no visor: o `#vs-quadro` que recebeu o transform no lugar da `<img>`, o
  `<a id="vs-ar-pino">`, a função `vsArMostra(p)`, a chamada dentro de
  `vsMostra`, o dimensionamento em `vsEnquadra`, e o botão `#vs-ar` do rodapé
- em `ligarVisor`: o `pointerdown` não captura o ponteiro em cima do pino
  (engoliria o clique do link) e `VS.moveu` separa tocar de arrastar
- no dossiê: o link `data-ra3d` em `fichaPranchaDossieHTML`
- o CSS de `#vs-quadro`, `#vs-ar-pino` e `#vs-ar`

Todos os trechos estão comentados no `index.html` publicado com a data
17/09/2026, o que facilita localizar.

**Nota sobre o cache:** `sw.js` é cache-first. Publicar `index.html` novo sem
trocar o nome do cache faz quem já tem o app instalado seguir servindo o antigo
para sempre. O gerador já versiona o cache pelo build; o sufixo atual `-ra4` some
sozinho no próximo build de verdade.

---

## 4. MÉDIA — conferir os 229 vínculos gravados como candidato

O commit `9b84dee` ligou 14 pranchas do DER-MG que estavam fora do acervo:

- **203 vínculos novos** em 11 pranchas (LPT, SSA-01/02, SDA-01/02, SSI-01,
  SDI-01, SDC, DSP, MPC, CDR). A evidência é que a descrição do código nomeia o
  mesmo tipo impresso na prancha ("Tipo SSA-01" ↔ prancha SSA-01).
- **26 vínculos realocados**: os códigos das descidas d'água **armadas**
  (DSR-02, DSA-02, DSC-02) apontavam para a folha da versão *não*-armada,
  enquanto a folha da armada estava vazia. As folhas não-armadas mantiveram os
  seus códigos comuns.

**Todos entraram com `est=1`** — o selo "CANDIDATO MINERADO — CONFERIR A
PRANCHA". O casamento foi derivado por leitura das descrições, não conferido
contra o desenho por quem entende do assunto.

Depois da conferência, virar para `est=0` apaga o selo. A planilha de conferência
foi entregue ao usuário no chat da sessão (`vinculos_RA_DER-MG.xlsx`, três abas:
vínculos novos, realocações, e pranchas sem item no SICRO).

Ao conferir as saídas d'água, atenção: os códigos vêm em pares
(`areia extraída` / `areia comercial`) e por bitola de sarjeta (STC 50/15,
50/20, 60/15…). Vale checar se a prancha cobre todas as bitolas ou só algumas.

---

## 5. Decisões em aberto — não são defeito, são escolha

**As 186 pranchas vigentes do álbum IPR-736 (DNIT) fora do acervo.** Parecia
lacuna e não é. Conferindo família por família, **todo código SICRO já tem
prancha** (BSCC 278/278, bueiros tubulares 836/836, bocas 88/88, dissipadores
96/96). As 186 são as *outras folhas* do mesmo dispositivo — o álbum traz 13 a 14
folhas por família de bueiro (vãos, tabelas de armadura, detalhes). Ligar todas
trocaria 1 prancha por 14 na ficha. É decisão de produto.

Se for atacar: o álbum **não tem camada de texto**, é escaneado. Os títulos saem
por OCR (`tesseract` com `-l por`, recorte do topo entre 1,5% e 7,5% da altura e
12% a 88% da largura, ampliado 2× e binarizado por Otsu — lê 186 de 186). A regra
de casar a sigla do código com a sigla do título acerta ~67%, então serve como
gerador de candidatos, não como verdade.

Cuidado com o carimbo: das 227 páginas da 5ª edição, **147 têm carimbo vermelho
"SUBSTITUÍDA PELA EMENDA 2/3/4"** e devem continuar fora. Detectam-se por pixels
vermelhos fortes (`R>130, G<90, B<90`) num render de 1400px de largura: página
carimbada dá ~5.900 pixels, página vigente dá exatamente 0. Nenhuma das 12
páginas hoje vinculadas carrega carimbo — a curadoria existente acertou.

**Documento duplicado no acervo.** `DOCUMENTOS OFICIAIS BAIXADOS/CATALOGO_SUDECAP/cap19-26-07-27-1.pdf`
e `Sudecap/Cadernos técnicos/Cap19_DRENAGEM_rev2026-07-30.pdf` são **o mesmo
arquivo** (103 de 103 páginas com texto idêntico), e os códigos estão repartidos
entre os dois caminhos: 6 pranchas por um, 42 pelo outro. Decidir qual caminho é
o canônico e consolidar.

---

## Apêndice — o que esta sessão publicou

| Commit | O quê |
|---|---|
| `8b6b66f` | pino de RA sobre o QR no visor + botão no rodapé + link no dossiê |
| `83676a8` | lê as 4 pranchas de RA que o detector perdia (31 → 35) |
| `9b84dee` | vincula as 14 pranchas de RA que estavam fora do acervo |
| `1105049` | remove `__pycache__` que entrou por engano |
| `4f75717` | `linkDoc` para de prometer rota pública para documento ausente |

Números medidos ao longo da investigação, para referência:

- 320 pranchas no acervo (eram 306), 49 com RA (eram 0)
- 10.801 vínculos de prancha no total; os que não resolviam eram do DER_PR
- 387 PDFs indexados, 356 presentes em `documentos/`
- o QR de realidade aumentada só existe no DER-MG — varridos os 346 PDFs
