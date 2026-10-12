# jsDelivr deployment

The repository root contains the `index.svg` entry point. Static assets live in
`public/`:

```text
index.svg
public/
  hohogames.svg
  gmteb/
  kqxhh/
  assets/
    bundle-zvx8twxc.js
    index-yqXGi6ZC-08bfbe96.css
    SFCompactText-*.woff2
```

The root `index.svg` loads its JavaScript, stylesheet, and favicon from
relative `./public/...` URLs, matching the root layout used by the reference
repository. The asset base is:

```text
https://cdn.jsdelivr.net/gh/erlindasantos0102-spec/hohogames@main/public/
```

Use the repository root URL:

```text
https://cdn.jsdelivr.net/gh/erlindasantos0102-spec/hohogames/index.svg
```

jsDelivr is static hosting and does not provide the Node server's Music API
proxy. The application must use a reachable backend origin for Music requests
when opened directly from jsDelivr.
