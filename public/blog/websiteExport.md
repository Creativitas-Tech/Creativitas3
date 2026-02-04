# Exporting a website from Creativitas

Creativitas uses webpack to assemble of the files needed for website exporting. There are a bunch of files which define how this works:

Creativitas/webpack.config.js
Creativitas/webpack.timing.config.js
public/synth-bundle
*  this is auto-generated
/scripts/synth-entry
* add new synth definitions or other files to include here
/src/webExport/components
* htmlTemplate generates the html boilerplate
* add imports to external files here