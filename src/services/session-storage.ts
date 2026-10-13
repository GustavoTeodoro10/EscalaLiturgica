import * as SecureStore from 'expo-secure-store';

const CHAVE = 'escala_token';

export async function lerToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CHAVE);
  } catch {
    return null;
  }
}

export async function salvarToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(CHAVE, token);
  } catch {
    // sem armazenamento seguro: a pessoa só precisará entrar de novo na próxima abertura
  }
}

export async function apagarToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CHAVE);
  } catch {
    // nada a fazer
  }
}
