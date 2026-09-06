# Licensing

Not legal advice; a summary of the licence texts and the LibRaw README, to make the static-linking decision
consciously.

## LibRaw

LibRaw is offered under **either** the GNU LGPL 2.1 **or** the CDDL 1.0, at the user's choice (the README
lists both; `LICENSE.LGPL` and `LICENSE.CDDL` ship in the tarball). Parts derived from `dcraw` are covered by
the same choice per LibRaw's grant; some contributed files are BSD-style.

- **LGPL 2.1**: statically linking LibRaw into a `.node` that ships inside a proprietary app requires
  (§6) that users can relink against a modified LibRaw, in practice by providing object files or using
  dynamic linking. A dynamic `libraw` sidecar satisfies this but reintroduces packaging problems
  ([build strategy](build-and-distribution-strategy.md)).
- **CDDL 1.0**: file-scoped copyleft. You may combine CDDL files with files under other licences into a
  larger work and distribute binaries, as long as modified CDDL source files are released under CDDL and the
  notices are kept. Static linking is fine. Choose CDDL for the vendored LibRaw and say so in the package.

Note: LibRaw's old GPL "demosaic packs" (user_qual 5–10) are GPL-2/3 and must not be included.

## Other vendored components

| Component | Licence | Static linking |
|---|---|---|
| zlib | zlib licence | fine, keep notice |
| libjpeg-turbo | IJG + BSD-3 + zlib | fine, keep notices |
| LCMS2 (optional) | MIT | fine |
| libgomp (GCC OpenMP runtime, optional) | GPL-3 with GCC Runtime Library Exception | static linking permitted under the exception when the code was compiled with GCC; document it |
| libomp (LLVM OpenMP, optional, macOS/Windows) | Apache-2.0 with LLVM exception | fine |
| node-addon-api / node-api-headers | MIT | fine |
| lightdrift-libraw C++ wrapper code, if reused | MIT | keep copyright line |

## The binding itself

Publish the binding under MIT (consistent with `@janhapke/sharp-electron`'s style of wrapping upstream), with
`THIRD_PARTY_NOTICES.md` generated at package time listing each vendored component, its version, and its
licence text, and a README sentence stating the LibRaw licence election (CDDL 1.0). photoview then needs the
same notices in its "About"/licences view; the knowledge base already flags that none of the existing
wrappers document this.
