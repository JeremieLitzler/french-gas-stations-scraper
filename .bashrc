# To use the aliases below, make sure to run `source .bashrc`
#
# Then use these aliases:
alias sb='source .bashrc'
alias sp-init='supabase init --force'
alias sp-login='supabase login'
alias sp-link-env='source .env && echo "linking to $SUPABASE_PROJECT_ID ... using password=$SUPABASE_PROJECT_PASSWORD" && supabase link --project-ref $SUPABASE_PROJECT_ID'
alias sp-gen-types='source .env && supabase gen types --lang=typescript --project-id "$SUPABASE_PROJECT_ID" --schema public > src/types/DatabaseTypes.ts'
alias sp-db-mnew='supabase migration new $1'
alias sp-db-mup='supabase migration up --linked'
alias sp-db-reset='supabase db reset --linked'
alias sp-db-seed='node --env-file=.env database/sedding.js'
alias sp-db-rs='sp-db-reset && node --env-file=.env database/sedding.js'
alias node-env-debug='source .env && node -e "console.log(true)"'
alias debug-alias='/usr/bin/echo "test"'
alias ui-add='npx shadcn-vue@latest add'
# git checkout
alias g-c='git c ' 
# git add + commit
alias g-ac='git ac ' 
alias g-a='git add '
alias g-m='git commit -m '
alias g-d='git pull'
alias g-u='git push'
# git checkout -b
alias g-nb='git cb ' 
# git checkout -t origin/
alias g-pb='git ct origin/' 
# git checkout main && git branch -D [branch-name]
alias g-rb='git c main && git branch -D ' 
# refresh local repo with the latest changes from main
alias g-um='git c main && git pull --rebase' 
# refresh local repo with the latest changes from develop
alias g-ud='git c develop && git pull --rebase' 
# list commits that are in the current branch but not in develop
alias g-log='git log develop..HEAD --oneline' 
alias nd='npm run dev'
alias nb='npm run build'
alias np='npm run preview'
alias nbo='npm run build-only'
alias nl='npm run lint'
alias nf='npm run format'
alias cc='npx ccusage@latest'