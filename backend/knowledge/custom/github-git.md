# Git e GitHub — Guia Técnico Completo

## Configuração inicial
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"

## Comandos essenciais do dia a dia

### Iniciar repositório
git init
git clone https://github.com/usuario/repo.git

### Status e histórico
git status                    // ver arquivos modificados
git log --oneline             // histórico resumido
git log --oneline --graph     // histórico com branches
git diff                      // ver mudanças não staged

### Adicionar e commitar
git add .                     // adiciona todos os arquivos
git add arquivo.js            // adiciona arquivo específico
git commit -m "mensagem"      // commit com mensagem
git commit -am "mensagem"     // add + commit (arquivos já rastreados)

### Branches
git branch                    // listar branches
git branch nome-branch        // criar branch
git checkout nome-branch      // mudar para branch
git checkout -b nome-branch   // criar e mudar
git switch nome-branch        // mudar (comando moderno)
git switch -c nome-branch     // criar e mudar (moderno)
git branch -d nome-branch     // deletar branch local
git push origin -d nome-branch // deletar branch remota

### Merge e Rebase
git merge nome-branch         // merge da branch atual com outra
git rebase main               // rebase na main
git cherry-pick hash-commit   // aplicar commit específico

### Remote (GitHub)
git remote add origin https://github.com/usuario/repo.git
git push origin main          // enviar para GitHub
git push -u origin main       // enviar e definir upstream
git pull origin main          // baixar e mesclar
git fetch origin              // baixar sem mesclar

### Desfazer mudanças
git restore arquivo.js        // desfazer mudança não staged
git restore --staged arquivo  // remover do staging
git reset HEAD~1              // desfazer último commit (mantém mudanças)
git reset --hard HEAD~1       // desfazer e apagar mudanças
git revert hash               // criar commit que desfaz outro

### Stash (guardar mudanças temporariamente)
git stash                     // guardar mudanças
git stash pop                 // restaurar mudanças
git stash list                // ver stashes guardados
git stash drop                // apagar stash

## Fluxo de trabalho padrão (Feature Branch)
1. git checkout -b feat/nova-feature
2. (desenvolver e testar)
3. git add .
4. git commit -m "feat: adiciona nova feature"
5. git push origin feat/nova-feature
6. Abrir Pull Request no GitHub
7. Code review
8. Merge na main
9. git checkout main && git pull

## Padrão de mensagens de commit (Conventional Commits)
feat: nova funcionalidade
fix: correção de bug
docs: atualização de documentação
style: formatação, sem mudança de lógica
refactor: refatoração sem nova feature
test: adição de testes
chore: tarefas de manutenção
perf: melhoria de performance

Exemplos:
git commit -m "feat: adiciona autenticação JWT"
git commit -m "fix: corrige erro 401 no middleware"
git commit -m "refactor: separa lógica de usuários em service"

## .gitignore essencial para Node.js
node_modules/
.env
.env.local
dist/
build/
.DS_Store
*.log
coverage/

## GitHub Actions (CI/CD básico)
Arquivo: .github/workflows/deploy.yml

on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm install
      - run: npm test
      - run: npm run build

## Pull Request — boas práticas
- Título claro descrevendo o que muda
- Descrição com contexto e screenshots se necessário
- Tamanho pequeno — máximo 400 linhas por PR
- Sempre revisar o próprio PR antes de pedir review
- Responder todos os comentários antes de mergear

## Tags e releases
git tag v1.0.0                // criar tag local
git tag -a v1.0.0 -m "versão 1.0" // tag anotada
git push origin v1.0.0        // enviar tag
git push origin --tags        // enviar todas as tags
