/** Cartões com os códigos de status HTTP que realmente importam. */

const STATUS = [
  ['200', 'OK', 'Deu certo.', 'var(--verde)'],
  ['201', 'Created', 'Criou algo. Mande o cabeçalho Location.', 'var(--verde)'],
  ['204', 'No Content', 'Deu certo e não há corpo. Típico do DELETE.', 'var(--verde)'],
  ['400', 'Bad Request', 'O pedido está malformado ou inválido.', 'var(--amarelo)'],
  ['401', 'Unauthorized', 'Você não disse quem é. (Nome enganoso: é autenticação.)', 'var(--amarelo)'],
  ['403', 'Forbidden', 'Sei quem você é, e você não pode.', 'var(--amarelo)'],
  ['404', 'Not Found', 'O recurso não existe.', 'var(--amarelo)'],
  ['409', 'Conflict', 'Conflito de estado — e-mail já cadastrado, por exemplo.', 'var(--amarelo)'],
  ['422', 'Unprocessable', 'JSON válido, mas com dados que não fazem sentido.', 'var(--amarelo)'],
  ['429', 'Too Many Requests', 'Calma lá. Limite de taxa estourado.', 'var(--amarelo)'],
  ['500', 'Internal Error', 'Seu código quebrou. Culpa do servidor.', 'var(--vermelho)'],
  ['503', 'Unavailable', 'Fora do ar ou sobrecarregado. Tente de novo depois.', 'var(--vermelho)'],
];

export default function criar() {
  const grade = document.createElement('div');
  grade.className = 'status-grade';
  grade.innerHTML = STATUS.map(
    ([codigo, nome, desc, cor]) => `
    <div class="status-cartao" style="--cor-st:${cor}">
      <code>${codigo}</code>
      <strong>${nome}</strong>
      <span>${desc}</span>
    </div>`,
  ).join('');
  return grade;
}
