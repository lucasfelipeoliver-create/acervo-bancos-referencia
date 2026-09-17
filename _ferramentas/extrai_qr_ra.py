# -*- coding: utf-8 -*-
"""Le o QR de realidade aumentada impresso nas pranchas e devolve o destino.

POR QUE ISTO EXISTE
    As pranchas do Caderno de Drenagem do DER-MG trazem um QR impresso com a
    nota "escaneie o codigo para visualizar o dispositivo em realidade
    aumentada". Ele aponta para o modelo 3D no 3D Warehouse da SketchUp.
    Quem esta com a prancha aberta no celular nao tem como escanear a propria
    tela: precisaria de um segundo aparelho. Entao o destino e lido AQUI, no
    build, e viaja para o app como dado — o QR continua impresso na prancha
    para quem for a campo com o papel.

POR QUE LER DO PDF, E NAO DO .webp
    No render de 2400px o QR fica com ~90px e a compressao webp borra os
    modulos: o detector do OpenCV nao le nenhum dos 306. No PDF o QR esta
    embutido como imagem propria, em 300x300 — le todos. De quebra,
    get_image_rects() da a caixa do QR na pagina, que normalizada serve para
    qualquer resolucao de render.

SAIDA
    JSON {"<rel>|<pagina>": [uuid, x, y, largura, altura]} com a caixa em
    FRACAO da pagina, na mesma chave que o manifesto PRANCHAS usa.

USO
    python3 extrai_qr_ra.py <raiz-dos-documentos> <pranchas.json> [saida.js]
"""
import collections, json, os, sys

import cv2
import numpy as np
import pymupdf

BASE_AR = "https://3dwarehouse.sketchup.com/ar-view/"


def _variantes(arr):
    """Versoes da mesma imagem, da mais barata para a mais teimosa.

    ACHADO 17/09/2026 — 4 das 35 pranchas do DER-MG (paginas 22, 44, 54 e 58)
    TEM o QR impresso e mesmo assim nao decodificavam no 1x: o JPEG embutido
    do PDF chega com artefato bastante para confundir o detector. Ampliar 2x a
    4x resolve todas. A versao anterior desta ferramenta parou no 1x e eu
    tratei o silencio como "esta prancha nao tem modelo" — nao tinha; ela
    tinha QR e faltou insistir. Por isso a escada abaixo, e por isso ela vai
    ate 6x antes de desistir.
    """
    cinza = cv2.cvtColor(arr, cv2.COLOR_BGR2GRAY)
    yield cinza
    for escala in (2, 3, 4, 6):
        yield cv2.resize(cinza, None, fx=escala, fy=escala,
                         interpolation=cv2.INTER_CUBIC)
        yield cv2.resize(cinza, None, fx=escala, fy=escala,
                         interpolation=cv2.INTER_NEAREST)
    _, otsu = cv2.threshold(cinza, 0, 255,
                            cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    yield otsu
    for escala in (2, 3, 4, 6):
        yield cv2.resize(otsu, None, fx=escala, fy=escala,
                         interpolation=cv2.INTER_NEAREST)
    _, borrado = cv2.threshold(cv2.GaussianBlur(cinza, (3, 3), 0), 0, 255,
                               cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    yield borrado
    for escala in (3, 4, 6):
        yield cv2.resize(borrado, None, fx=escala, fy=escala,
                         interpolation=cv2.INTER_NEAREST)


def decodifica(det, arr):
    """Le o QR tentando a escada inteira; devolve "" se nenhuma versao ler."""
    for versao in _variantes(arr):
        try:
            texto, _, _ = det.detectAndDecode(versao)
        except cv2.error:
            continue
        if texto:
            return texto
    return ""


def extrai(raiz_documentos, manifesto_pranchas):
    """Devolve {chave: [uuid, x, y, w, h]} para as pranchas que tem QR."""
    por_pdf = collections.defaultdict(list)
    for chave in manifesto_pranchas:
        rel, pag = chave.rsplit("|", 1)
        por_pdf[rel].append((int(pag), chave))

    det = cv2.QRCodeDetector()
    achados = {}
    for rel, paginas in sorted(por_pdf.items()):
        caminho = os.path.join(raiz_documentos, rel)
        if not os.path.exists(caminho):
            print("  ausente:", rel, file=sys.stderr)
            continue
        doc = pymupdf.open(caminho)
        for pag, chave in sorted(paginas):
            if not (1 <= pag <= doc.page_count):
                continue
            pagina = doc[pag - 1]
            reto = pagina.rect
            for info in pagina.get_images(full=True):
                xref = info[0]
                try:
                    bruto = doc.extract_image(xref)
                except Exception:
                    continue
                arr = cv2.imdecode(np.frombuffer(bruto["image"], np.uint8),
                                   cv2.IMREAD_COLOR)
                if arr is None:
                    continue
                alt, larg = arr.shape[:2]
                # o QR e quadrado: descarta figura e foto antes de decodificar
                if abs(larg - alt) > max(larg, alt) * 0.12 or larg < 80:
                    continue
                texto = decodifica(det, arr)
                if not texto or not texto.startswith(BASE_AR):
                    continue
                caixas = pagina.get_image_rects(xref)
                if not caixas:
                    continue
                r = caixas[0]
                achados[chave] = [
                    texto[len(BASE_AR):],
                    round((r.x0 - reto.x0) / reto.width, 5),
                    round((r.y0 - reto.y0) / reto.height, 5),
                    round(r.width / reto.width, 5),
                    round(r.height / reto.height, 5),
                ]
                break
        doc.close()
    return achados


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    raiz, man = sys.argv[1], sys.argv[2]
    saida = sys.argv[3] if len(sys.argv) > 3 else None
    achados = extrai(raiz, json.load(open(man, encoding="utf-8")))
    js = ('var RA3D_BASE="%s";\nvar RA3D=%s;'
          % (BASE_AR, json.dumps(achados, ensure_ascii=False,
                                 separators=(",", ":"))))
    if saida:
        open(saida, "w", encoding="utf-8").write(js)
        print("%d pranchas com RA -> %s" % (len(achados), saida))
    else:
        print(js)
    return 0


if __name__ == "__main__":
    sys.exit(main())
