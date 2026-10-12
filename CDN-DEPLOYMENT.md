# jsDelivr deployment

The repository's `public/` directory is the static asset root:

```text
public/
  index.svg
  hohogames.svg
  gmteb/
  kqxhh/
  assets/
    bundle-zvx8twxc.js
    index-yqXGi6ZC-08bfbe96.css
    SFCompactText-*.woff2
```

The `public/index.svg` entry loads its JavaScript, stylesheet, and favicon
using paths relative to itself. That is required because jsDelivr serves the
repository below `/gh/<owner>/<repo>/public/`, not at the domain root.
Its static asset base is:

```text
https://cdn.jsdelivr.net/gh/erlindasantos0102-spec/hohogames@main/public/
```

Select the `erlindasantos0102-spec/hohogames` repository, the `main` branch,
and the `public/` directory when locating these files in jsDelivr.

The full application can render from jsDelivr, but jsDelivr is static hosting:
it does not provide the Node server's Music API proxy. Keep the Node server
available for API requests and configure the app to use its public origin
when opening the page directly from jsDelivr. Commit and push changes to
`public/` before expecting jsDelivr to serve them.
