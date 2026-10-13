// Na web o expo-secure-store não existe; o token fica no localStorage do navegador.
const CHAVE = 'escala_token';

export async function lerToken(): Promise<string | null> {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export async function salvarToken(token: string): Promise<void> {
  try {
    localStorage.setItem(CHAVE, token);
  } catch {
    // navegador bloqueou o armazenamento: a sessão dura só enquanto a aba estiver aberta
  }
}

export async function apagarToken(): Promise<void> {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // nada a fazer
  }
}
