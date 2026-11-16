/**
 * Trilha "C# e .NET" — do zero, para quem vem de Python e TypeScript.
 *
 * Todo bloco executável é um programa de arquivo único (`dotnet run arquivo.cs`,
 * SDK 10+), inclusive as APIs: o exemplo sobe o servidor numa porta livre,
 * chama a si mesmo e encerra.
 */

import { linguagem } from './01-linguagem.js';
import { aspnet } from './02-aspnet.js';
import { projeto } from './03-projeto.js';

export const trilha = {
  id: 'csharp',
  ordem: 60,
  titulo: 'C# e .NET',
  subtitulo: 'A linguagem, LINQ, async e uma API com ASP.NET Core e Entity Framework',
  icone: '🟣',
  cor: '#9b7fe8',
  ponte: 'a partir de Python e TypeScript',
  modulos: [linguagem, aspnet, projeto],
};
