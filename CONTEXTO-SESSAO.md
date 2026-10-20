# Contexto da sessão — Clínicas estéticas em Anápolis-GO

**Data:** 22/09/2026
**Status:** PAUSADO. Falta configurar a virtualização e o WSL2. Retomar amanhã.

## Objetivo
1. Rodar o scraper do Google Maps para achar **clínicas estéticas em Anápolis - GO**.
2. Para cada clínica, levantar o **site** e o **Instagram** (e também telefone, e-mail, nota e avaliações).

## Onde paramos
- O Docker Desktop foi instalado (por usuário) e o login foi feito. A licença foi aceita.
- **Bloqueio:** o Docker Desktop mostra **"Virtualization not detected"** (`supportsVirtualization:false` no log).
- O WSL2 **não está instalado** (`wsl -l -v` só mostra a ajuda de instalação).
- O comando `docker` não está no PATH do terminal. O executável fica em:
  `C:\Users\ghvas\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`
  (depois de reiniciar o PC, o PATH deve passar a funcionar).

## O que o usuário vai fazer (ver `GUIA-CONFIGURACAO-DOCKER.pdf`)
1. Ativar a virtualização (Intel VT-x / AMD SVM) na BIOS.
2. Rodar `wsl --install --no-distribution` no PowerShell como Administrador.
3. Reiniciar o PC e abrir o Docker Desktop até aparecer "Engine running".

## O que o Claude faz ao retomar
1. Checar o Docker: `docker info` (ou usar o caminho completo acima).
2. Subir o scraper: `docker compose up -d` na pasta `C:\Users\ghvas\Documents\scraper`.
3. Testar: `curl http://localhost:8080/api/v1/jobs`.
4. Rodar (o usuário já pediu site + Instagram, então usar `--socials`):
   ```
   python scripts/scrape.py "clínica estética em Anápolis GO" --city "Anápolis, GO" --depth 5 --socials --out clinicas-esteticas-anapolis.csv
   ```
   - Coordenadas de Anápolis: lat `-16.3281`, lon `-48.9530`.
   - Se vier pouco resultado, acrescentar as palavras-chave "estética facial Anápolis GO",
     "harmonização facial Anápolis GO" e "depilação a laser Anápolis GO" (num único job, via `--keywords-file`).
5. Salvar o CSV na pasta, resumir no chat (quantidade, amostra e quantos têm site/Instagram).
6. Para quem ficar sem Instagram (a cobertura do `--socials` é de uns 40–70%), completar com busca na web.

## Alternativa se o Docker não funcionar
Montar a lista pela busca na web (clínicas + site + Instagram). É menos completa: sem e-mails em massa, nota e avaliações.

## Observações
- Emails e telefones são dados pessoais. Usar para prospecção respeitando a LGPD (dar opção de descadastro).
- Responder sempre em português do Brasil.
