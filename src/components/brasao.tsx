import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

// O brasão é preto sobre transparente: some em fundo escuro. Ele sempre vai sobre um selo de
// pergaminho (cor fixa da marca, não do tema), em qualquer modo.
const PERGAMINHO = '#F4EEE0';
const FILETE = '#DCD0B4';

type BrasaoProps = {
  tamanho?: number;
};

export function Brasao({ tamanho = 96 }: BrasaoProps) {
  const folga = Math.round(tamanho * 0.06);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Brasão da Paróquia São Vicente de Paulo"
      style={[
        styles.selo,
        { width: tamanho, height: tamanho, borderRadius: tamanho / 2, padding: folga, backgroundColor: PERGAMINHO },
      ]}>
      <Image source={require('@/assets/images/brasao.png')} contentFit="contain" style={styles.imagem} />
    </View>
  );
}

const styles = StyleSheet.create({
  selo: {
    borderWidth: 1,
    borderColor: FILETE,
    overflow: 'hidden',
  },
  imagem: {
    width: '100%',
    height: '100%',
  },
});
