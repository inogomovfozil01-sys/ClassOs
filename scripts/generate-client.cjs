const fs=require('fs');const {spawnSync}=require('child_process');
const production=process.argv.includes('--production')||process.env.VERCEL==='1';
const schema=production?'prisma/schema.postgresql.prisma':'prisma/schema.prisma';
if(production)fs.writeFileSync(schema,fs.readFileSync('prisma/schema.prisma','utf8').replace('provider = "sqlite"','provider = "postgresql"'));
const result=spawnSync(process.execPath,['node_modules/prisma/build/index.js','generate','--schema',schema],{stdio:'inherit'});process.exit(result.status||0);
