import fs from 'node:fs/promises';
import path from 'node:path';
import { fixture } from './auth-fixture.mjs';
import worker from '../worker.js';
export async function browserFixture(width=1280) {
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'});
  const f=await fixture(), page=await browser.newPage({viewport:{width,height:844}});
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.hostname!=='partes.test')return route.fulfill({contentType:'application/javascript',body:url.pathname.includes('tesseract')?'window.Tesseract={recognize:async()=>({data:{text:"Nombre: Persona ficticia\\nDireccion: Calle ficticia\\nDescripcion: Revisar humedad"}})};':''});
    if(url.pathname.startsWith('/api/')){
      requests.push({path:url.pathname,method:req.method(),data:req.postData()?req.postDataJSON():null});
      const response=await worker.fetch(new Request(req.url(),{method:req.method(),headers:await req.allHeaders(),...(req.postData()?{body:req.postData()}: {})}),f.env);
      return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
    }
    const file=path.resolve('dist','.'+(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(path.resolve('dist')+path.sep))return route.abort();
    return route.fulfill({contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html',body:await fs.readFile(file)});
  });
  await page.goto('https://partes.test/');
  async function login(who){await page.locator('#loginForm [name=username]').fill(f.users[who].username);await page.locator('#loginForm [name=password]').fill(f.users[who].password);await page.locator('#loginForm button').click();await page.waitForFunction(()=>!document.body.classList.contains('signed-out'));}
  async function action(id){if(await page.locator('#mobileMenuBtn').isVisible())await page.locator('#mobileMenuBtn').click();await page.locator('#'+id).click();}
  return {f,page,errors,requests,login,action,async close(){await browser.close();f.close()}};
}
