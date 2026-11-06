import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import logo from "../../assets/Logo.svg";
import type { PrizeId } from "../../types/evento";
import { ANGULO_DA_FATIA, FATIAS, anguloDeRepouso, calcularAnguloFinal } from "../../utils/roleta";
import { LINHAS_DA_FATIA } from "./rotulos";

const RAIO = 2;
const RAIO_DO_CENTRO = 0.58;
const VOLTAS = 6;
const TAMANHO_DA_TEXTURA = 2048;
const CAMPO_DE_VISAO = 34;

function lerToken(nome: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
}

function cor(nome: string): THREE.Color {
  return new THREE.Color(lerToken(nome));
}

// Sorteio com semente: ao redesenhar uma fatia esgotada, o "pó" das outras
// continua igual, em vez de todas tremerem na tela.
function geradorComSemente(semente: number): () => number {
  let valor = semente;
  return () => {
    valor = (valor * 16807) % 2147483647;
    return valor / 2147483647;
  };
}

function desenharFatias(canvas: HTMLCanvasElement, esgotados: PrizeId[]) {
  const contexto = canvas.getContext("2d");

  if (!contexto) {
    throw new Error("Canvas 2D indisponível.");
  }

  const centro = TAMANHO_DA_TEXTURA / 2;
  const fundoEsgotado = lerToken("--sombra-esgotado");
  const textoEsgotado = lerToken("--sombra-esgotado-texto");
  const claro = lerToken("--texto-invertido");
  const escuro = lerToken("--violeta-escuro");
  contexto.clearRect(0, 0, TAMANHO_DA_TEXTURA, TAMANHO_DA_TEXTURA);

  FATIAS.forEach((id, indice) => {
    const esgotado = esgotados.includes(id);
    const angulo = indice * ANGULO_DA_FATIA - Math.PI / 2;
    const aleatorio = geradorComSemente(indice + 11);

    contexto.save();
    contexto.beginPath();
    contexto.moveTo(centro, centro);
    contexto.arc(centro, centro, centro, angulo - ANGULO_DA_FATIA / 2, angulo + ANGULO_DA_FATIA / 2);
    contexto.closePath();
    contexto.clip();
    contexto.fillStyle = esgotado ? fundoEsgotado : lerToken(`--sombra-${id}`);
    contexto.fillRect(0, 0, TAMANHO_DA_TEXTURA, TAMANHO_DA_TEXTURA);

    for (let ponto = 0; ponto < 2600; ponto += 1) {
      const distancia = centro * Math.sqrt(aleatorio());
      const giro = angulo + (aleatorio() - 0.5) * ANGULO_DA_FATIA;
      contexto.globalAlpha = 0.035 + aleatorio() * 0.05;
      contexto.fillStyle = aleatorio() > 0.5 ? claro : escuro;
      contexto.fillRect(
        centro + Math.cos(giro) * distancia,
        centro + Math.sin(giro) * distancia,
        2 + aleatorio() * 3,
        2 + aleatorio() * 3,
      );
    }

    contexto.globalAlpha = 0.14;
    contexto.strokeStyle = esgotado ? textoEsgotado : lerToken(`--sombra-${id}-texto`);
    contexto.lineWidth = 4;

    for (const fracao of [0.97, 0.93]) {
      contexto.beginPath();
      contexto.arc(centro, centro, centro * fracao, angulo - ANGULO_DA_FATIA / 2, angulo + ANGULO_DA_FATIA / 2);
      contexto.stroke();
    }

    if (esgotado) {
      contexto.globalAlpha = 0.25;
      contexto.lineWidth = 6;
      for (let risco = -TAMANHO_DA_TEXTURA; risco < TAMANHO_DA_TEXTURA; risco += 44) {
        contexto.beginPath();
        contexto.moveTo(risco, 0);
        contexto.lineTo(risco + TAMANHO_DA_TEXTURA, TAMANHO_DA_TEXTURA);
        contexto.stroke();
      }
    }

    contexto.restore();

    const linhas = esgotado ? ["Esgotado"] : LINHAS_DA_FATIA[id];
    const tamanhoDaFonte = linhas.length > 1 ? 66 : 84;

    contexto.save();
    contexto.translate(centro, centro);
    contexto.rotate(angulo);
    contexto.fillStyle = esgotado ? textoEsgotado : lerToken(`--sombra-${id}-texto`);
    contexto.font = `600 ${tamanhoDaFonte}px Poppins, sans-serif`;
    contexto.textAlign = "right";
    contexto.textBaseline = "middle";

    linhas.forEach((linha, posicao) => {
      const deslocamento = (posicao - (linhas.length - 1) / 2) * tamanhoDaFonte * 1.05;
      contexto.fillText(linha, centro * 0.82, deslocamento);
    });

    contexto.restore();
  });
}

function criarPrato(indice: number, materiais: THREE.Material[]): THREE.Mesh {
  const folga = 0.012;
  const meio = Math.PI / 2 - indice * ANGULO_DA_FATIA;
  const inicio = meio - ANGULO_DA_FATIA / 2 + folga;
  const fim = meio + ANGULO_DA_FATIA / 2 - folga;

  const forma = new THREE.Shape();
  forma.moveTo(Math.cos(inicio) * RAIO_DO_CENTRO, Math.sin(inicio) * RAIO_DO_CENTRO);
  forma.absarc(0, 0, RAIO, inicio, fim, false);
  forma.absarc(0, 0, RAIO_DO_CENTRO, fim, inicio, true);

  const geometria = new THREE.ExtrudeGeometry(forma, {
    depth: 0.05,
    bevelEnabled: true,
    bevelSize: 0.012,
    bevelThickness: 0.018,
    bevelSegments: 2,
    curveSegments: 20,
  });

  const prato = new THREE.Mesh(geometria, materiais);
  prato.receiveShadow = true;
  prato.castShadow = true;
  return prato;
}

function criarBatom(): { pivo: THREE.Group; balanco: THREE.Group } {
  const metal = new THREE.MeshStandardMaterial({
    color: cor("--estojo-metal"),
    metalness: 1,
    roughness: 0.22,
  });
  const laca = new THREE.MeshPhysicalMaterial({
    color: cor("--estojo-laca"),
    roughness: 0.28,
    clearcoat: 1,
  });
  const pigmento = new THREE.MeshPhysicalMaterial({
    color: cor("--batom"),
    roughness: 0.32,
    clearcoat: 0.6,
  });

  const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.36, 32), laca);
  corpo.position.y = -0.18;

  const anel = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.08, 32), metal);
  anel.position.y = 0.03;

  const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.18, 32), metal);
  tubo.position.y = 0.14;

  // O corte diagonal na ponta é o que faz a peça ser lida como batom, não como tubo.
  const geometriaDaPonta = new THREE.CylinderGeometry(0.135, 0.135, 0.34, 32, 1);
  const posicoes = geometriaDaPonta.getAttribute("position");
  for (let vertice = 0; vertice < posicoes.count; vertice += 1) {
    if (posicoes.getY(vertice) > 0) {
      posicoes.setY(vertice, posicoes.getY(vertice) + posicoes.getZ(vertice) * 1.15);
    }
  }
  geometriaDaPonta.computeVertexNormals();
  const ponta = new THREE.Mesh(geometriaDaPonta, pigmento);
  ponta.position.y = 0.4;

  const pecas = new THREE.Group();
  pecas.add(corpo, anel, tubo, ponta);
  pecas.rotation.x = Math.PI / 2 + 0.72;
  pecas.traverse((peca) => {
    peca.castShadow = true;
  });

  const balanco = new THREE.Group();
  balanco.add(pecas);

  const pivo = new THREE.Group();
  pivo.position.set(0, 0.92, -(RAIO + 0.2));
  pivo.add(balanco);

  return { pivo, balanco };
}

export class CenaDoEstojo {
  private readonly renderizador: THREE.WebGLRenderer;
  private readonly cena = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(CAMPO_DE_VISAO, 1, 0.1, 100);
  private readonly roda = new THREE.Group();
  private readonly balancoDoBatom: THREE.Group;
  private readonly canvasDasFatias = document.createElement("canvas");
  private readonly texturaDasFatias: THREE.CanvasTexture;
  private readonly espelho: Reflector;
  private angulo = 0;
  private esgotados: PrizeId[] = [];
  private quadro: number | null = null;
  private descartada = false;
  private aoCancelar: (() => void) | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderizador = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderizador.shadowMap.enabled = true;
    this.renderizador.shadowMap.type = THREE.PCFSoftShadowMap;

    const gerador = new THREE.PMREMGenerator(this.renderizador);
    this.cena.environment = gerador.fromScene(new RoomEnvironment(), 0.04).texture;
    this.cena.environmentIntensity = 0.38;
    gerador.dispose();

    this.canvasDasFatias.width = TAMANHO_DA_TEXTURA;
    this.canvasDasFatias.height = TAMANHO_DA_TEXTURA;
    desenharFatias(this.canvasDasFatias, this.esgotados);
    this.texturaDasFatias = new THREE.CanvasTexture(this.canvasDasFatias);
    this.texturaDasFatias.colorSpace = THREE.SRGBColorSpace;
    this.texturaDasFatias.anisotropy = this.renderizador.capabilities.getMaxAnisotropy();
    // A extrusão usa as próprias coordenadas (x, y) da forma como UV. Estes dois
    // ajustes fazem a textura única cobrir o disco inteiro, de -RAIO a +RAIO.
    this.texturaDasFatias.repeat.set(1 / (RAIO * 2), 1 / (RAIO * 2));
    this.texturaDasFatias.offset.set(0.5, 0.5);

    this.montarRoda();
    this.montarEstojo();
    this.espelho = this.montarTampa();

    const { pivo, balanco } = criarBatom();
    this.balancoDoBatom = balanco;
    this.cena.add(pivo);

    this.montarLuzes();

    this.camera.position.set(0, 10.3, 7.9);
    this.camera.lookAt(0, 0.95, -0.9);

    this.canvas.addEventListener("webglcontextrestored", this.renderizar);
    void this.carregarLogo();
  }

  private montarRoda() {
    const topo = new THREE.MeshStandardMaterial({
      map: this.texturaDasFatias,
      roughness: 0.92,
      metalness: 0,
    });
    const lateral = new THREE.MeshStandardMaterial({ color: cor("--estojo-fundo"), roughness: 0.7 });
    const pratos = new THREE.Group();
    pratos.rotation.x = -Math.PI / 2;

    FATIAS.forEach((_, indice) => {
      pratos.add(criarPrato(indice, [topo, lateral]));
    });

    const metal = new THREE.MeshStandardMaterial({
      color: cor("--estojo-metal"),
      metalness: 1,
      roughness: 0.25,
    });
    const pino = new THREE.CylinderGeometry(0.032, 0.032, 0.14, 12);

    FATIAS.forEach((_, indice) => {
      const angulo = Math.PI / 2 - (indice + 0.5) * ANGULO_DA_FATIA;
      const marcador = new THREE.Mesh(pino, metal);
      marcador.position.set(Math.cos(angulo) * (RAIO - 0.03), 0.13, -Math.sin(angulo) * (RAIO - 0.03));
      marcador.castShadow = true;
      this.roda.add(marcador);
    });

    this.roda.add(pratos);
    this.cena.add(this.roda);
  }

  private montarEstojo() {
    const metal = new THREE.MeshStandardMaterial({
      color: cor("--estojo-metal"),
      metalness: 1,
      roughness: 0.2,
    });
    const laca = new THREE.MeshPhysicalMaterial({
      color: cor("--estojo-laca"),
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
    });

    const corpo = new THREE.Mesh(new THREE.CylinderGeometry(RAIO + 0.3, RAIO + 0.36, 0.42, 128), laca);
    corpo.position.y = -0.24;
    corpo.castShadow = true;
    corpo.receiveShadow = true;

    const poco = new THREE.Mesh(
      new THREE.CylinderGeometry(RAIO + 0.06, RAIO + 0.06, 0.02, 128),
      new THREE.MeshStandardMaterial({ color: cor("--estojo-fundo"), roughness: 0.8 }),
    );
    poco.position.y = -0.02;
    poco.receiveShadow = true;

    const aro = new THREE.Mesh(new THREE.TorusGeometry(RAIO + 0.17, 0.085, 24, 160), metal);
    aro.rotation.x = Math.PI / 2;
    aro.position.y = 0.0;
    aro.castShadow = true;

    const centroMetal = new THREE.Mesh(
      new THREE.CylinderGeometry(RAIO_DO_CENTRO, RAIO_DO_CENTRO + 0.03, 0.16, 96),
      metal,
    );
    centroMetal.position.y = 0.07;
    centroMetal.castShadow = true;

    const dobradica = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 24), metal);
    dobradica.rotation.z = Math.PI / 2;
    dobradica.position.set(0, -0.06, -(RAIO + 0.38));

    const chao = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ color: cor("--estojo-fundo"), opacity: 0.1 }),
    );
    chao.rotation.x = -Math.PI / 2;
    chao.position.y = -0.46;
    chao.receiveShadow = true;

    this.cena.add(corpo, poco, aro, centroMetal, dobradica, chao);
  }

  private montarTampa(): Reflector {
    const raioDaTampa = RAIO + 0.3;
    const metal = new THREE.MeshStandardMaterial({
      color: cor("--estojo-metal"),
      metalness: 1,
      roughness: 0.2,
    });
    const laca = new THREE.MeshPhysicalMaterial({
      color: cor("--estojo-laca"),
      roughness: 0.3,
      clearcoat: 1,
    });

    const casco = new THREE.Mesh(new THREE.CylinderGeometry(raioDaTampa, raioDaTampa, 0.16, 128), laca);
    casco.rotation.x = Math.PI / 2;
    casco.castShadow = true;

    const moldura = new THREE.Mesh(new THREE.TorusGeometry(RAIO + 0.1, 0.07, 24, 160), metal);
    moldura.position.z = 0.09;

    const espelho = new Reflector(new THREE.CircleGeometry(RAIO + 0.1, 128), {
      textureWidth: 1024,
      textureHeight: 1024,
      clipBias: 0.003,
      color: cor("--estojo-espelho"),
    });
    espelho.position.z = 0.085;

    // O espelho precisa de um "ambiente" para refletir: sem fundo, a parte vazia
    // apareceria preta, já que o canvas é transparente para deixar a marca Venus ver.
    const fundoDoEspelho = cor("--estojo-reflexo");
    const desenharReflexo = espelho.onBeforeRender;
    espelho.onBeforeRender = (renderizador, cena, camera, geometria, material, grupo) => {
      cena.background = fundoDoEspelho;
      desenharReflexo.call(espelho, renderizador, cena, camera, geometria, material, grupo);
      cena.background = null;
    };

    const disco = new THREE.Group();
    disco.position.y = raioDaTampa;
    disco.add(casco, moldura, espelho);

    const tampa = new THREE.Group();
    tampa.position.set(0, -0.06, -(RAIO + 0.46));
    tampa.rotation.x = -0.1;
    tampa.add(disco);

    this.cena.add(tampa);
    return espelho;
  }

  private montarLuzes() {
    this.cena.add(new THREE.HemisphereLight(cor("--fundo"), cor("--lavanda"), 0.75));

    const principal = new THREE.DirectionalLight(cor("--fundo"), 1.15);
    principal.position.set(-3.5, 9, 4.5);
    principal.castShadow = true;
    principal.shadow.mapSize.set(2048, 2048);
    principal.shadow.camera.left = -6;
    principal.shadow.camera.right = 6;
    principal.shadow.camera.top = 6;
    principal.shadow.camera.bottom = -6;
    principal.shadow.radius = 5;
    principal.shadow.bias = -0.0006;
    this.cena.add(principal);
  }

  private async carregarLogo() {
    const imagem = new Image();
    imagem.src = logo;
    await imagem.decode();

    if (this.descartada) {
      return;
    }

    const lado = 1024;
    const tela = document.createElement("canvas");
    tela.width = lado;
    tela.height = lado;
    tela.getContext("2d")?.drawImage(imagem, 0, 0, lado, lado);

    const textura = new THREE.CanvasTexture(tela);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.anisotropy = this.renderizador.capabilities.getMaxAnisotropy();

    const selo = new THREE.Mesh(
      new THREE.CircleGeometry(RAIO_DO_CENTRO - 0.07, 96),
      new THREE.MeshStandardMaterial({ map: textura, roughness: 0.4, transparent: true }),
    );
    selo.rotation.x = -Math.PI / 2;
    selo.position.y = 0.155;
    selo.receiveShadow = true;
    this.cena.add(selo);
    this.renderizar();
  }

  private readonly renderizar = () => {
    if (!this.descartada) {
      this.renderizador.render(this.cena, this.camera);
    }
  };

  redimensionar(largura: number, altura: number) {
    if (largura === 0 || altura === 0) {
      return;
    }

    this.renderizador.setSize(largura, altura, false);
    const proporcao = largura / altura;
    this.camera.aspect = proporcao;
    // Em tela estreita, o campo vertical abre para o estojo continuar cabendo de lado a lado.
    const tangente = Math.tan(THREE.MathUtils.degToRad(CAMPO_DE_VISAO / 2));
    this.camera.fov =
      proporcao >= 1
        ? CAMPO_DE_VISAO
        : THREE.MathUtils.radToDeg(2 * Math.atan(tangente / proporcao));
    this.camera.updateProjectionMatrix();
    this.renderizar();
  }

  redesenharFatias(esgotados: PrizeId[] = this.esgotados) {
    this.esgotados = esgotados;
    desenharFatias(this.canvasDasFatias, esgotados);
    this.texturaDasFatias.needsUpdate = true;
    this.renderizar();
  }

  posicionarEm(sliceIndex: number, landingOffset: number) {
    this.angulo = anguloDeRepouso(sliceIndex, landingOffset);
    this.roda.rotation.y = this.angulo;
    this.renderizar();
  }

  girarPara(sliceIndex: number, landingOffset: number, duracaoMs: number): Promise<void> {
    const voltas = duracaoMs > 1000 ? VOLTAS : 0;
    const inicio = this.angulo;
    const alvo = calcularAnguloFinal(inicio, sliceIndex, landingOffset, voltas);
    const instanteInicial = performance.now();
    let fatiaAnterior = Math.floor(inicio / ANGULO_DA_FATIA + 0.5);
    let balanco = 0;

    return new Promise((resolver) => {
      this.aoCancelar = resolver;
      let terminou = false;

      const animar = (instante: number) => {
        const progresso = Math.min(1, (instante - instanteInicial) / duracaoMs);
        const suavizado = 1 - Math.pow(1 - progresso, 4);
        this.angulo = inicio + (alvo - inicio) * suavizado;
        this.roda.rotation.y = this.angulo;

        const fatiaAtual = Math.floor(this.angulo / ANGULO_DA_FATIA + 0.5);
        if (fatiaAtual !== fatiaAnterior) {
          fatiaAnterior = fatiaAtual;
          balanco = 1;
        }
        balanco *= 0.84;
        this.balancoDoBatom.rotation.y = -balanco * 0.16;
        this.renderizar();

        if (progresso >= 1 && !terminou) {
          terminou = true;
          this.aoCancelar = null;
          resolver();
        }

        if (progresso < 1 || balanco > 0.01) {
          this.quadro = requestAnimationFrame(animar);
        } else {
          this.balancoDoBatom.rotation.y = 0;
          this.quadro = null;
          this.renderizar();
        }
      };

      if (this.quadro !== null) {
        cancelAnimationFrame(this.quadro);
      }
      this.quadro = requestAnimationFrame(animar);
    });
  }

  descartar() {
    this.descartada = true;

    if (this.quadro !== null) {
      cancelAnimationFrame(this.quadro);
    }

    this.aoCancelar?.();
    this.canvas.removeEventListener("webglcontextrestored", this.renderizar);
    this.espelho.dispose();
    this.texturaDasFatias.dispose();
    this.cena.environment?.dispose();
    this.cena.traverse((objeto) => {
      if (objeto instanceof THREE.Mesh) {
        objeto.geometry.dispose();
        const materiais: THREE.Material[] = Array.isArray(objeto.material)
          ? objeto.material
          : [objeto.material];
        materiais.forEach((material) => material.dispose());
      }
    });
    this.renderizador.dispose();
  }
}
