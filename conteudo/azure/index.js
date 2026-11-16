/**
 * Trilha "Azure e Azure DevOps".
 *
 * É a única trilha que não executa: uma conta de nuvem não cabe num
 * laboratório local. Em troca, tem três painéis interativos (a arquitetura do
 * sistema, "onde eu rodo isto?" e um simulador de pipeline YAML) e muito
 * código para ler: `az`, Bicep, Dockerfile, pipeline e KQL.
 */

import { fundamentos } from './01-nuvem.js';
import { entrega, operacao } from './02-entrega.js';

export const trilha = {
  id: 'azure',
  ordem: 80,
  titulo: 'Azure e Azure DevOps',
  subtitulo: 'A nuvem da Microsoft para quem já publica: identidade, computação, dados, Bicep, pipelines e operação',
  icone: '☁️',
  cor: '#4aa3e8',
  ponte: 'a partir do Cloudflare e do Netlify',
  modulos: [fundamentos, entrega, operacao],
};
