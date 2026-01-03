# GolLens — Análise Preditiva de Jogadores de Futebol

GolLens é uma ferramenta de análise de futebol focada em **previsões no nível do jogador**, utilizando modelagem estatística transparente e interpretável.  
Ela permite explorar países, ligas, times e jogadores, estimando **expectativa de gols e probabilidade de marcar** nos próximos jogos.

O projeto prioriza **clareza, explicabilidade e análise prática**, evitando abordagens de “caixa-preta”.

---

## Objetivo

O principal objetivo do GolLens é responder a uma pergunta simples e poderosa:

**“Com base no desempenho da temporada atual, qual a probabilidade de um jogador marcar gols nos próximos jogos?”**

Todos os cálculos são baseados em métricas observáveis e em métodos amplamente utilizados na análise de futebol.

---

## Funcionalidades Principais

- Navegação por País → Liga → Time → Jogador  
- Visão geral das estatísticas do jogador  
- Modelagem de expectativa de gols da temporada  
- Definição do número de próximos jogos para projeção  
- Ajuste de qualidade média das finalizações  
- Ajuste de eficiência de finalização  
- Recalculo instantâneo ao alterar parâmetros  
- Interface limpa e profissional  

---

## Visão Geral do Modelo Analítico

O GolLens utiliza fórmulas determinísticas comuns em análises de desempenho no futebol.

### Expected Goals (xG aproximado)

Quando o número de chutes está disponível:

xG ≈ chutes × qualidade_do_chute

Fallback quando não há dados de chutes:

xG ≈ gols × 0.35

---

### Índice de Finalização

Mede o quão eficiente o jogador é na conversão de chances:

finalização = clamp(gols / xG, 0.5, limite)

---

### Expectativa de Gols Futuros

xG_por_jogo = xG / jogos  
λ = xG_por_jogo × próximos_jogos  

Modo com ajuste por eficiência:

λ = xG_por_jogo × finalização × próximos_jogos

---

### Probabilidade de Marcar Gol

P(≥1 gol) = 1 − e^(−λ)

---

## Aviso Legal

Este projeto tem finalidade exclusivamente analítica e educacional.
