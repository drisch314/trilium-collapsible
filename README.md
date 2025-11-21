# trilium-collapsible
A widget to enable collapsible sections and bullet points in Trilium.  
*(Tested in TriliumNext v0.99.5)*

## Features
!["Collapsible Section" Button](./images/collapsible-section-button.png)
* A button has been added to the text-editing toolbar to toggle collapsibility for the heading targeted by the cursor. Collapsible headings can be distinguished by an arrow that appears to the left of them, indicating whether it is collapsed or expanded.
    * Collapsible headings can show/hide the section that immediately follows them.
    * A section consists of elements with an indent level greater than their header.
* If collapsible bullets are enabled, all bullet points with a sub-list may be clicked to toggle its visibility.

Some elements (like code blocks) don't play well with my indent-based section implementation, as they don't maintain an indent level. So I made their behavior dependent on the line before them.

But for those of you who would mostly use this to hide text (like me!), this won't be too big of a problem. Images should work fine, and other odd elements will be okay if you put a properly indented line right before them.

## Notice!
In order to make collapsible features persistent upon note reloads, this widget has to update note content in a way that will inadvertently erase your local undo/redo history (this should not impact Trilium's Note Revisions history).

This occurs in two circumstances:  
1. When toggling collapsibility for a section heading.
2. When expanding/collapsing a section or bullet point.

## Why this?
When I first switched from Notion to Trilium, this was one of the key features I missed. And it turns out I was not alone:  
https://github.com/TriliumNext/Trilium/issues/947
https://github.com/TriliumNext/Trilium/issues/1850

However, because CKEditor (Trilium's text editor) sanitizes its HTML, typical methods of applying custom styles to the frontend (like adding a class) don't persist upon reloading the note. A widget attempting this implemention for collapsible bullets can be found [here](https://github.com/TriliumNext/Trilium/issues/1850#issuecomment-1734283248). But this gets cumbersome if there are big sections that you want to keep collapsed for navigation, as you would have to re-collapse them every time you open the note.

This did not discourage me, however, and I eventually found a narrow workaround within the confines that I am aware of, using comments to trojan horse data into the inline styles of elements.

This is my first Trilium widget, so I'm not that deep into what's possible with the API or CKEditor, but I can't see very many other ways to get this working persistently.

If you have ideas for how to improve a feature or implement a new one, please feel free to suggest them!

## Installation
1. Create a code note of type `JS frontend`
2. Copy the contents of trilium-collapsible.js into the note
3. Give the note the label `#widget`
4. Optionally add these labels to enable UI-friendly options if you don't like the default behavior:
```
#label:doCollapsibleHeaders="promoted,alias=Collapsible Headers,single,boolean" #doCollapsibleHeaders=true 
#label:doCollapsibleLists="promoted,alias=Collapsible Lists,single,boolean" #doCollapsibleLists=true 
#label:indentImages="promoted,alias=Try to Indent Images,single,boolean" #indentImages=true 
#label:indentUnhandled="promoted,alias=Try to Indent Special Elements,single,boolean" #indentUnhandled=true 
#label:indentLevels="promoted,alias=Supported Indent Levels,single,number" #indentLevels=10 
#label:toolbarButtonPosition="promoted,alias=Toolbar Button Position,single,number" #toolbarButtonPosition=2
```
5. Reload Trilium

## Planned Features
* Make collapsible bullet points proportional to the font size.