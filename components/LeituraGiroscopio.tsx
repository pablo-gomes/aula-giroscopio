// PASSO 1: Importar tudo o que vamos precisar.
// 'React', 'useState' e 'useEffect' são as ferramentas essenciais do React.
import React, { useEffect, useState } from 'react';
// 'View', 'Text' e 'StyleSheet' são os blocos de construção para nossa interface visual.
import { StyleSheet, Text, View } from 'react-native';
// E a estrela do show: o 'Gyroscope' da biblioteca expo-sensors.
import { Gyroscope } from 'expo-sensors';

// Este é o nosso componente principal, a tela do nosso aplicativo.
export default function LeituraGiroscopio() {
  // --- A MEMÓRIA DO NOSSO COMPONENTE ---

  // PASSO 2: Criar uma "memória" para guardar os dados do sensor.
  // Usamos o 'useState' para isso. É como dar uma caixinha para o nosso componente guardar informações.
  // 'data' -> É a nossa variável que vai guardar o objeto { x, y, z }.
  // 'setData' -> É a ÚNICA função que devemos usar para ATUALIZAR o valor de 'data'.
  // O valor inicial dentro dos parênteses (useState(...)) é { x: 0, y: 0, z: 0 }.
  
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });

  // --- INSTRUÇÕES PARA INTERAGIR COM O MUNDO EXTERIOR ---

  // PASSO 3: Usar o 'useEffect' para "conversar" com o hardware do celular.
  // Pense no useEffect como um manual de instruções que diz ao componente:
  // "Quando você aparecer na tela pela primeira vez, faça o seguinte..."
  useEffect(() => {
    // ------------------ INÍCIO DAS INSTRUÇÕES ------------------

    // A) Definimos a rapidez com que queremos receber atualizações do sensor.
    // 100 milissegundos (ou 10 vezes por segundo) nos dá uma resposta bem fluida.
    Gyroscope.setUpdateInterval(300);

    // B) Começamos a "escutar" o giroscópio.
    // O 'addListener' é como ligar um microfone. Ele recebe uma função que
    // será executada TODA VEZ que o sensor tiver uma nova leitura.
    const subscription = Gyroscope.addListener(gyroscopeData => {
      // Quando uma nova leitura ('gyroscopeData') chega, nós a guardamos
      // em nossa "memória" usando a função 'setData'.
      setData(gyroscopeData);
    });

    // C) A parte MAIS IMPORTANTE: a limpeza!
    // A função que RETORNAMOS dentro do useEffect é como uma instrução de despedida:
    // "Quando o componente estiver prestes a sair da tela, execute esta última tarefa."
    // Isso é CRUCIAL para não deixar o sensor ligado para sempre, o que gastaria
    // muita bateria e poderia causar erros no aplicativo (memory leak).
    return () => {
      // Aqui, nós "desligamos o microfone", parando de escutar o sensor.
      subscription.remove();
    };

    // ------------------- FIM DAS INSTRUÇÕES --------------------

  }, []); // O array vazio `[]` no final significa: "Execute estas instruções apenas UMA VEZ".

  // --- O QUE SERÁ MOSTRADO NA TELA ---

  // PASSO 4: Preparar os dados para exibição.
  // Pegamos os valores de x, y, e z de dentro do nosso estado 'data'.
  const { x, y, z } = data;

  // PASSO 5: Renderizar a interface visual (JSX).
  // Tudo o que está dentro do 'return' é o que o usuário vai ver.
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leitura do Giroscópio</Text>
      
      {/* 
        Exibimos os valores na tela.
        Usamos '.toFixed(2)' para formatar os números, mostrando apenas duas casas decimais
        para que a leitura fique mais limpa e fácil de entender.
      */}
      <Text style={styles.text}>x: {x.toFixed(1) == '-0.0' || x.toFixed(1) == '-0' ? '0.0' : x.toFixed(1)}</Text>
      <Text style={styles.text}>y: {y.toFixed(1) == '-0.0' || y.toFixed(1) == '-0' ? '0.0' : y.toFixed(1)}</Text>
      <Text style={styles.text}>z: {z.toFixed(1) == '-0.0' || z.toFixed(1) == '-0' ? '0.0' : z.toFixed(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 20,
  },
  text: {
    fontSize: 20,
    color: '#ecf0f1',
    marginTop: 10,
  },
});
