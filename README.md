# Cinegang

Cinegang é uma plataforma experimental de streaming de tela com foco em
**baixa latência**, utilizando WebRTC para transmissão de vídeo e áudio.

A aplicação permite publicar uma transmissão diretamente pelo OBS Studio
e assisti-la através de uma interface web desenvolvida em Next.js.

## Arquitetura

O projeto separa o frontend da infraestrutura de streaming:

``` text
OBS Studio (H.264 + Opus)
        |
    WHIP / HTTPS
        |
        v
      Caddy
 Reverse Proxy + TLS
        |
        v
     MediaMTX
      WebRTC
        |
    WHEP / WebRTC
        |
        v
Next.js / Vercel ---> Navegador
```

### Componentes

-   **Next.js** --- interface web e player
-   **MediaMTX** --- servidor de mídia/WebRTC
-   **Caddy** --- reverse proxy e HTTPS
-   **OBS Studio** --- publicação da transmissão via WHIP
-   **DuckDNS** --- hostname público para o servidor de mídia
-   **Oracle Cloud** --- VPS executando MediaMTX e Caddy
-   **Vercel** --- hospedagem do frontend

## Fluxo da transmissão

A publicação é realizada pelo OBS utilizando WHIP:

``` text
OBS
 ↓
WHIP / HTTPS
 ↓
Caddy
 ↓
MediaMTX
```

Os espectadores recebem a transmissão utilizando WHEP/WebRTC:

``` text
MediaMTX
 ↓
WHEP / WebRTC
 ↓
Cinegang
 ↓
Navegador
```

A mídia não passa pela Vercel. O frontend apenas estabelece a sessão
WebRTC com o MediaMTX.

## Requisitos

### Desenvolvimento local

-   Node.js
-   npm
-   Next.js

### Servidor de streaming

-   Linux
-   Docker
-   Docker Compose
-   Caddy
-   MediaMTX

### Publicação

-   OBS Studio com suporte a WHIP

## Desenvolvimento

Clone o projeto:

``` bash
git clone <URL_DO_REPOSITORIO>
cd cinegang
```

Instale as dependências:

``` bash
npm install
```

Crie o arquivo `.env.local`:

``` env
NEXT_PUBLIC_MEDIAMTX_URL=https://seu-servidor.duckdns.org
```

Execute:

``` bash
npm run dev
```

A aplicação estará disponível em:

``` text
http://localhost:3000
```

## Assistindo uma stream

As transmissões são acessadas através de:

``` text
/watch/<stream>
```

Por exemplo:

``` text
/watch/cinegang
/watch/gameplay
/watch/teste
```

O frontend estabelece uma sessão WHEP com:

``` text
https://seu-servidor.duckdns.org/<stream>/whep
```

## Publicando pelo OBS

No OBS Studio, configure o serviço para utilizar WHIP.

Servidor:

``` text
https://seu-servidor.duckdns.org/<stream>/whip
```

Exemplo:

``` text
https://seu-servidor.duckdns.org/gameplay/whip
```

A publicação requer um **Bearer Token**.

> Nunca armazene credenciais reais de publicação neste repositório.

### Configuração recomendada

Para maior estabilidade:

``` text
Codec:         H.264
Resolução:     1280x720
FPS:           30
Rate Control:  CBR
Keyframe:      2 s
B-frames:      0
```

O bitrate adequado depende da conexão entre o publisher e o servidor.

## MediaMTX

Exemplo simplificado de configuração:

``` yaml
authMethod: internal

authInternalUsers:
  - user: streamer
    pass: CHANGE_ME
    permissions:
      - action: publish

  - user: any
    pass:
    permissions:
      - action: read

webrtc: true

webrtcAdditionalHosts:
  - seu-servidor.duckdns.org

paths:
  all_others:
```

Essa configuração permite:

-   criação dinâmica de nomes de stream;
-   publicação somente por usuários autenticados;
-   reprodução pública das streams.

> Não versione o arquivo de produção contendo credenciais reais.

## Docker

A infraestrutura de mídia utiliza dois containers:

``` text
Caddy
 └── :80 / :443

MediaMTX
 └── :8189/UDP
```

O MediaMTX não precisa expor a porta HTTP `8889` diretamente para a
Internet. Caddy e MediaMTX se comunicam através da rede interna do
Docker.

Exemplo:

``` yaml
services:
  mediamtx:
    image: bluenviron/mediamtx:1
    restart: unless-stopped

    volumes:
      - ./mediamtx.yml:/mediamtx.yml:ro

    ports:
      - "8189:8189/udp"

  caddy:
    image: caddy:2
    restart: unless-stopped

    ports:
      - "80:80"
      - "443:443"

    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config

volumes:
  caddy_data:
  caddy_config:
```

## Caddy

Exemplo de `Caddyfile`:

``` caddy
seu-servidor.duckdns.org {
    reverse_proxy mediamtx:8889
}
```

Caddy é responsável pelo HTTPS e encaminha WHIP/WHEP para o MediaMTX.

## Portas

A VPS precisa permitir:

  Porta   Protocolo   Uso
  ------- ----------- ---------------------------------------
  22      TCP         SSH
  80      TCP         HTTP / emissão e redirecionamento TLS
  443     TCP         HTTPS / WHIP / WHEP
  8189    UDP         mídia WebRTC

A porta `8889` não precisa ser exposta publicamente quando o MediaMTX
está atrás do Caddy.

## Deploy do frontend

O frontend pode ser hospedado na Vercel.

Configure a variável:

``` env
NEXT_PUBLIC_MEDIAMTX_URL=https://seu-servidor.duckdns.org
```

e faça o deploy do repositório.

O fluxo em produção será:

``` text
Usuário
   |
   v
Vercel / Next.js
   |
   | WHEP
   v
Caddy
   |
   v
MediaMTX
```

## Segurança

Atualmente a arquitetura suporta:

-   HTTPS;
-   publicação autenticada;
-   leitura pública;
-   MediaMTX protegido por reverse proxy;
-   porta HTTP interna do MediaMTX não exposta diretamente;
-   credenciais de publicação separadas do frontend.

Para uma implantação com múltiplos usuários, recomenda-se substituir a
credencial global de publicação por **stream keys individuais** ou
autenticação externa.

## Status

O MVP atualmente suporta:

-   [x] Publicação pelo OBS
-   [x] WHIP
-   [x] Reprodução WebRTC
-   [x] WHEP
-   [x] Áudio
-   [x] Vídeo H.264
-   [x] Baixa latência
-   [x] HTTPS
-   [x] Nomes de stream dinâmicos
-   [x] Publicação autenticada
-   [x] Reprodução pública
-   [x] Frontend Next.js
-   [x] Deploy na Vercel
-   [x] MediaMTX em VPS
-   [x] Reinicialização automática dos serviços
-   [ ] Contas de usuário
-   [ ] Stream keys individuais
-   [ ] Criação de transmissões pela interface
-   [ ] Revogação de stream keys
-   [ ] Página de transmissões ativas
-   [ ] Controle de acesso para espectadores
-   [ ] Monitoramento e métricas

## Próximos passos

A próxima etapa do projeto é implementar autenticação de usuários e
substituir a credencial global do OBS por **stream keys individuais
associadas a cada usuário/transmissão**.

Isso permitirá que o backend valide se uma determinada chave possui
autorização para publicar em um path específico.

``` text
stream: gameplay
key:    ********
        |
        v
"Esta chave pode publicar em gameplay?"
        |
      SIM/NÃO
        |
        v
     MediaMTX
```

## Licença

Livre
