// As fotos são enviadas ao Cloudinary no tamanho original (até 4 MB). Aqui pedimos
// uma versão redimensionada na entrega, para a vitrine não baixar imagens gigantes
// dentro de cards de ~300px. URLs que não são do Cloudinary passam sem alteração.
const CLOUDINARY = "res.cloudinary.com";

export function optimizeImage(url: string | null | undefined, width: number): string {
  if (!url) return "";
  if (!url.includes(CLOUDINARY) || !url.includes("/upload/")) return url;

  const [head, tail] = url.split("/upload/");
  // Evita aplicar duas vezes se a URL já tiver largura definida.
  if (/^([^/]*,)?w_\d+/.test(tail)) return url;

  // Mantém f_auto,q_auto, se existirem, e acrescenta a largura (2x para telas retina).
  const hasAuto = tail.startsWith("f_auto,q_auto/");
  const rest = hasAuto ? tail.slice("f_auto,q_auto/".length) : tail;
  return `${head}/upload/f_auto,q_auto,w_${width * 2},c_limit/${rest}`;
}
