/*
trilium-collapsible is a widget to enable collapsible sections and bullet points in Trilium.
Copyright (C) 2025  drisch314

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/*
 * This custom widget allows headings to be made collapsible. Collapsible headings
 * can show or hide indented sections that immediately follow them.
 * (Functionality is similar to Toggle Headings in Notion)
 * 
 * Sections are defined (mostly) as subsequent elements with a higher indent level than the heading.
 * There is also an option to enable the collapsing of bulleted lists.
 * 
 * Source: https://github.com/drisch314/trilium-collapsible
 */

/*
To fully enable the widget options, add these attributes to its JS frontent note:
#label:doCollapsibleHeaders="promoted,alias=Collapsible Headings,single,boolean" #doCollapsibleHeaders=true 
#label:doCollapsibleLists="promoted,alias=Collapsible Lists,single,boolean" #doCollapsibleLists=true 
#label:indentImages="promoted,alias=Try to Indent Images,single,boolean" #indentImages=true 
#label:indentUnhandled="promoted,alias=Try to Indent Special Elements,single,boolean" #indentUnhandled=true 
#label:considerListsIndented="promoted,alias=Consider Lists Indented,single,boolean" #considerListsIndented=true 
#label:indentLevels="promoted,alias=Supported Indent Levels,single,number" #indentLevels=10 
#label:toolbarButtonPosition="promoted,alias=Toolbar Button Position,single,number" #toolbarButtonPosition=2
#label:allHeadersCollapsible="promoted,alias=All Headings Collapsible,single,boolean" #allHeadersCollapsible=false 
#label:minimalCollapsedHeaders="promoted,alias=Minimal Collapsed Headings,single,boolean" #minimalCollapsedHeaders=false
#label:minimalCollapsedLists="promoted,alias=Minimal Collapsed Lists,single,boolean" #minimalCollapsedLists=false 
#label:dynamicListIndicator="promoted,alias=Dynamic List Indicator,single,boolean" #dynamicListIndicator=false
#label:showListSectionLines="promoted,alias=Show List Section Lines,single,boolean" #showListSectionLines=false 
#label:collapsedIndicatorColor="promoted,alias=Collapsed Indicator Color,single,color" #collapsedIndicatorColor="#80e0e0"
#label:useCollapsedIndicatorColor="promoted,alias=Use Collapsed Indicator Color,single,boolean" #useCollapsedIndicatorColor=false
#label:addKeyProtections="promoted,alias=Enter & Delete Protections,single,boolean" #addKeyProtections=true 
#label:usingOldLayout="promoted,alias=Using Old UI Layout,single,boolean" #usingOldLayout=false 

And add this label to enable functionality on mobile:
#run=mobileStartup
*/

const doCollapsibleHeaders = api.startNote.getLabelValue('doCollapsibleHeaders') ?? 'true';
const doCollapsibleLists = api.startNote.getLabelValue('doCollapsibleLists') ?? 'true';
const indentImages = api.startNote.getLabelValue('indentImages') ?? 'true';
const indentUnhandled = api.startNote.getLabelValue('indentUnhandled') ?? 'true';
const considerListsIndented = api.startNote.getLabelValue('considerListsIndented') ?? 'true';
const indentLevels = api.startNote.getLabelValue('indentLevels') ?? 10;
const toolbarButtonPosition = api.startNote.getLabelValue('toolbarButtonPosition') ?? 2;
const allHeadersCollapsible = api.startNote.getLabelValue('allHeadersCollapsible') ?? 'false';
const minimalCollapsedHeaders = api.startNote.getLabelValue('minimalCollapsedHeaders') ?? 'false';
const minimalCollapsedLists = api.startNote.getLabelValue('minimalCollapsedLists') ?? 'false';
const dynamicListIndicator = api.startNote.getLabelValue('dynamicListIndicator') ?? 'false';
const showListSectionLines = api.startNote.getLabelValue('showListSectionLines') ?? 'false';
const collapsedIndicatorColor = api.startNote.getLabelValue('collapsedIndicatorColor') ?? '#80e0e0';
const useCollapsedIndicatorColor = api.startNote.getLabelValue('useCollapsedIndicatorColor') ?? 'false';
const addKeyProtections = api.startNote.getLabelValue('addKeyProtections') ?? 'true';
const usingOldLayout = api.startNote.getLabelValue('usingOldLayout') ?? 'false';

// These only appear in the HTML metadata, so there's no real need to change these.
// If you change them after you've already started using the widget, things can break.
const collapsible = '▼collapsible▼';
const collapsed = '▼collapsed▼';
const listCollapsed = '▼list-collapsed▼';
const hidden = '▼hidden▼';
const error = '▼error▼';

// Button that goes into the text-editing toolbar. Toggles collapsibility of headings.
const TPL = `
    <button
        id="collapsible-section-toggle"
        class="collapsible-section-button ck ck-button bx bxs-down-arrow"
        type="button"
        data-cke-tooltip-text="Collapsible Section"
    ></button>
`;

const hiddenElementSelectors = `
    [style*="/*${hidden}*/"],
    :has( > [style*="/*${hidden}*/"]),
    :is(ul, ol):has([style*="/*${hidden}*/"])
`;

let collapsibleElementSelectors = `
    h2[style*="/*${collapsible}*/"],
    h3[style*="/*${collapsible}*/"],
    h4[style*="/*${collapsible}*/"],
    h5[style*="/*${collapsible}*/"],
    h6[style*="/*${collapsible}*/"]
`;
if (allHeadersCollapsible === 'true') {
    collapsibleElementSelectors = `h2, h3, h4, h5, h6`;
}

const collapsedElementSelectors = `
    h2[style*="/*${collapsed}*/"],
    h3[style*="/*${collapsed}*/"],
    h4[style*="/*${collapsed}*/"],
    h5[style*="/*${collapsed}*/"],
    h6[style*="/*${collapsed}*/"]
`;

const unhandledElementSelectors = `
    div:has( > .ck-horizontal-line), .include-note, .ck-mermaid__wrapper, .hljs, .table
`;


const standardSelectors = [];
const childSelectors = [];
const grandchildSelectors = [];

for (let indentLevel = 1; indentLevel <= indentLevels; indentLevel++) {
    standardSelectors.push(`[style*="margin-left:${indentLevel * 40}px"]`);
    childSelectors.push(`:has( > [style*="margin-left:${indentLevel * 40}px"])`);
    grandchildSelectors.push(`:is(ul, ol):has(li > p[style*="margin-left:${indentLevel * 40}px"])`);
}

// Adjust styles according to the settings.
let indentStyles = '';
if (indentImages === 'true' || indentUnhandled === 'true') {
    const indentStyleList = [];
    const elementSelectorList = [];
    if (indentImages === 'true') elementSelectorList.push('.image');
    if (indentUnhandled === 'true') {
        elementSelectorList.push(unhandledElementSelectors);
    }
    const elementSelectors = elementSelectorList.join(', ');
    for (let indentLevel = 1; indentLevel <= indentLevels; indentLevel++) {
        indentStyleList.push(`
        .note-detail-editable-text-editor :is(
                :not(li) > :is(ul, ol):has(li > p[style*="margin-left:${indentLevel * 40}px"]),
                :not(li, .ck-content):has( > [style*="margin-left:${indentLevel * 40}px"]),
                :is(
                    ${standardSelectors[indentLevel - 1]},
                    ${childSelectors[indentLevel - 1]},
                    ${grandchildSelectors[indentLevel - 1]}
                ) + :is(${elementSelectors}))
            { margin-left: ${indentLevel * 40}px }
        `);
    }
    indentStyles = indentStyleList.join('\n');
}

const minimalCollapsedListsCss = `
/* Hide default list marker */
.note-detail-editable-text-editor
        ul:not(.todo-list) > li::marker {
    color: #0000;
}

.note-detail-editable-text-editor
        ul:not(.todo-list) > li {
    --ck-content-list-marker-color: var(--ck-content-font-color);
}

.note-detail-editable-text-editor
        ul:not(.todo-list) > li > ul:not(.todo-list) {
    --ck-content-list-marker-color: var(--ck-content-font-color);
}

/* Custom disc marker */
.note-detail-editable-text-editor
        ul:not(.todo-list) > li > :first-child::before {
    display: inline-block;
    position: relative;
    box-sizing: border-box;
    float: none;
    width: 14px;
    height: 14px;
    margin-left: -14px;
    left: -4.88px;
    top: 1.5px;
    content: "";
    background-color: #0000;
    outline-style: solid;
    outline-width: 3px;
    --ck-content-list-marker-color: inherit;
    outline-color: var(--ck-content-list-marker-color);
    outline-offset: -7px;
    border-style: solid;
    border-width: 1px;
    border-color: transparent;
    border-radius: 50%;
    transition: background-color 200ms ease, border-color 200ms ease;
}

/* Custom circle marker */
.note-detail-editable-text-editor
        ul:not(.todo-list)
            ul:not(.todo-list) > li > :first-child::before {
    outline-style: solid;
    outline-width: 1px;
    outline-offset: -5px;
}

/* Custom square marker */
.note-detail-editable-text-editor
        ul:not(.todo-list)
            ul:not(.todo-list)
                ul:not(.todo-list) > li > :first-child::before {
    outline-style: solid;
    outline-width: 3px;
    outline-offset: -7px;
    border-radius: 0px;
}

/* Only add the hover effect for lists that have sublists */
.note-detail-editable-text-editor
        ul:not(.todo-list) > li:has( > :is(ul, ol))
        > :first-child:not(
            [style*="/*${listCollapsed}*/"],
            :has([style*="/*${listCollapsed}*/"])
        ):hover::before {
    background-color: oklch(from var(--ck-color-base-background) calc(l + (0.8 - l) * 0.3) c h);
    cursor: pointer;
}

.note-detail-editable-text-editor
        ul:not(.todo-list)
            > li:has( > :is(ul, ol))
                > :is(
                    :first-child:has([style*="/*${listCollapsed}*/"]),
                    [style*="/*${listCollapsed}*/"]
                )::before {
    cursor: pointer;
    ${
        useCollapsedIndicatorColor == 'true'? `
        background-color: ${collapsedIndicatorColor + '33'};
        border-color: ${collapsedIndicatorColor + '55'};
        outline-color: ${collapsedIndicatorColor};
        ` : `
        background-color: oklch(from var(--ck-color-base-background) calc(l + (0.8 - l) * 0.3) c h);
        border-color: oklch(from var(--ck-color-base-background) calc(l + (0.8 - l) * 0.5) c h);
        `
    }
}
`;
const explicitCollapsedListsCss = `
.note-detail-editable-text-editor
        ul:not(.todo-list) > li {
    --ck-content-list-marker-color: var(--ck-content-font-color);
}

.note-detail-editable-text-editor
        ul:not(.todo-list) > li > ul:not(.todo-list) {
    --ck-content-list-marker-color: var(--ck-content-font-color);
}

.note-detail-editable-text-editor
        ul:not(.todo-list) > li:has( > :is(ul, ol)) > :first-child {
    position: relative;
}

/* Collapsible Marker */
.note-detail-editable-text-editor
        ul:not(.todo-list) > li:has( > :is(ul, ol)) > :first-child::before {
    content: "►";
    color: var(--ck-content-list-marker-color);
    display: inline-block;
    box-sizing: border-box;
    position: relative;
    float: none;
    top: -2px;
    left: -20px;
    line-height: 100%;
    margin-left: -16px;
    padding-left: 5px;
    padding-right: 3px;
    padding-top: 4px;
    padding-bottom: 3.5px;
    width: 16px;
    height: 16px;
    align-items: center;
    cursor: pointer;
    transform: rotate(90deg);
    ${
        dynamicListIndicator == 'true'?
            'transition: transform 300ms ease; opacity: 0;' :
            'transition: background-color 200ms ease, transform 300ms ease;'
    }
    font-size: 8px;
    border-radius: 50%;
}

/* Only add the hover effect for lists that have sublists */
.note-detail-editable-text-editor
        ul:not(.todo-list) > li:has( > :is(ul, ol)) > :first-child:hover::before {
    background-color: var(--icon-button-hover-background);
    ${dynamicListIndicator == 'true'? 'opacity: 1;' : ''}
}

.note-detail-editable-text-editor
        ul:not(.todo-list)
            > li:has( > :is(ul, ol))
                > :is(
                    :first-child:has([style*="/*${listCollapsed}*/"]),
                    [style*="/*${listCollapsed}*/"]
                )::before {
    transform: rotate(0);
    ${dynamicListIndicator == 'true'? 'opacity: 1;' : ''}
    ${useCollapsedIndicatorColor == 'true'? `color: ${collapsedIndicatorColor};` : ''}
}

.note-detail-editable-text-editor
        ul:not(.todo-list)
            > li:has( > :is(ul, ol)):has(
                    > [style*="/*${listCollapsed}*/"],
                    > :first-child [style*="/*${listCollapsed}*/"]
                ) > :first-child:hover::before {
    ${
        useCollapsedIndicatorColor == 'true'?
        `background-color: ${collapsedIndicatorColor + '33'};` : ''
    }
}

/* Recolor default list marker when collapsed (if collapsed color is enabled) */
${
    useCollapsedIndicatorColor == 'true'? `
    .note-detail-editable-text-editor
            ul:not(.todo-list)
                > li:has( > :is(ul, ol)):has(
                    > [style*="/*${listCollapsed}*/"],
                    > :first-child [style*="/*${listCollapsed}*/"]
                )::marker {
        color: ${collapsedIndicatorColor};
    }
    ` : ``
}
`;
const listSectionLinesCss = `
.note-detail-editable-text-editor ul:not(.todo-list) > li > :is(ul, ol) {
    margin-left: -12.6px;
    padding-left: calc(32px + 12.6px);
    border-left-style: solid;
    border-width: 1px;
    border-color: oklch(from var(--ck-color-base-background) calc(l + (0.8 - l) * 0.3) c h);
    transition: border-color 200ms ease;
}

/*.note-detail-editable-text-editor
        ul:not(.todo-list) > li:has( > :is(ul, ol)):has( > :first-child:hover)
        > :is(ul, ol) {
    border-color: oklch(from var(--ck-color-base-background) calc(l + (0.8 - l) * 0.5) c h);
}*/
`;
const collapsibleListsStyles = `
/* Collapsible Bullets CSS */

${minimalCollapsedLists == 'true'? minimalCollapsedListsCss : explicitCollapsedListsCss}

${showListSectionLines == 'true'? listSectionLinesCss : ''}

.note-detail-editable-text-editor :first-child:has([style*="/*${listCollapsed}*/"]) + :is(ul, ol),
.note-detail-editable-text-editor [style*="/*${listCollapsed}*/"] + :is(ul, ol) {
    display: none;
}
`;

let collapsibleHeadingStyles = `
    position: relative;
    padding-left: 12px;
`;
let uncollapsedHeadingStyles = `
    content: "►";
    display: flex;
    position: absolute;
    top: calc(50% - 8px);
    left: -8px;
    padding-left: 4px;
    padding-right: 3px;
    padding-top: 3px;
    padding-bottom: 3px;
    width: 16px;
    height: 16px;
    align-items: center;
    cursor: pointer;
    transform: rotate(90deg);
    transition: background-color 200ms ease, transform 300ms ease;
    font-size: 10px;
    border-radius: 50%;
`;
let uncollapsedHeadingHoverStyles = `
    background-color: var(--icon-button-hover-background);
    color: var(--icon-button-hover-color);
`;
let collapsedHeadingStyles = `
    transform: rotate(0);
    ${
        useCollapsedIndicatorColor == 'true'? `
        color: ${collapsedIndicatorColor};
        ` : ``
    }
`;
if (minimalCollapsedHeaders == 'true') {
    // Change the styles to be minimal
    collapsibleHeadingStyles = `
        position: relative;
        padding-left: 2px;
    `;
    uncollapsedHeadingStyles = `
        content: "";
        display: flex;
        position: absolute;
        top: 10%;
        left: -10px;
        width: 8px;
        height: 80%;
        cursor: pointer;
        transition: background-color 200ms ease, border-color 200ms ease;
        border-radius: 2px;
    `;
    uncollapsedHeadingHoverStyles = `
        background-color: oklch(from var(--ck-color-base-background) calc(l + (0.8 - l) * 0.3) c h);
        border-color: oklch(from var(--ck-color-base-background) calc(l + (0.8 - l) * 0.45) c h);
    `;
    collapsedHeadingStyles = `
        border-right-style: solid;
        border-width: 2px;
        ${
            useCollapsedIndicatorColor == 'true'? `
            background-color: ${collapsedIndicatorColor + '33'};
            border-color: ${collapsedIndicatorColor};
            ` : `
            background-color: oklch(
                from var(--ck-color-base-background) calc(l + (0.8 - l) * 0.3) c h);
            border-color: oklch(
                from var(--ck-color-base-background) calc(l + (0.8 - l) * 0.6) c h);
            `
        }
    `;
}

const collapsibleHeadersStyles = `
/* Collapsible Sections CSS */

#collapsible-section-toggle::before {
    font-size: 16px;
}

/* This detects if the marker is present in the element's inline styles. */
.note-detail-editable-text-editor :is(
    ${collapsibleElementSelectors},
    ${collapsedElementSelectors}
):not(ul *) {
    ${collapsibleHeadingStyles}
}

.note-detail-editable-text-editor :is(
    ${collapsibleElementSelectors},
    ${collapsedElementSelectors}
):not(ul *)::before {
    ${uncollapsedHeadingStyles}
}

.note-detail-editable-text-editor :is(
    ${collapsibleElementSelectors}
):not(ul *, [style*="/*${collapsed}*/"]):hover::before {
    ${uncollapsedHeadingHoverStyles}
}

.note-detail-editable-text-editor :is(
    ${collapsibleElementSelectors},
    ${collapsedElementSelectors}
)[style*="/*${collapsed}*/"]::before {
    ${collapsedHeadingStyles}
}

/* Collapsed hover styles if custom color is enabled */
.note-detail-editable-text-editor :is(
    ${collapsedElementSelectors}
):not(ul *):hover::before {
    ${useCollapsedIndicatorColor == 'true'? `
        background-color: ${collapsedIndicatorColor + '33'};
    ` : `
        ${uncollapsedHeadingHoverStyles}
    `}
}

/* Detect hidden error elements whose collapsible section header got deleted */
.note-detail-editable-text-editor
        :not(:is(${collapsedElementSelectors}), :is(${hiddenElementSelectors}))
        + [style*="/*${error}*/"] {
    display: block !important;
    position: relative;
    padding-left: 12px;
    border-bottom: 1px solid red;
    
    /* Hide the text */
    color: transparent;
}

.note-detail-editable-text-editor
        :not(:is(${collapsedElementSelectors}), :is(${hiddenElementSelectors}))
        + [style*="/*${error}*/"]::before {
    content: "⚠︎";
    display: flex;
    position: absolute;
    top: calc(50% - 9px);
    left: -9px;
    width: fit-content;
    min-width: 18px;
    height: 18px;
    padding: 3px;
    align-items: center;
    cursor: pointer;
    transition: background-color 200ms ease;
    font-size: 10px;
    border-radius: 9px;
    background-color: rgba(255, 0, 0, 0.25);
    justify-content: center;
    color: red;
}

.note-detail-editable-text-editor
        :not(:is(${collapsedElementSelectors}), :is(${hiddenElementSelectors}))
        + [style*="/*${error}*/"]:hover {
    cursor: pointer;
}

.note-detail-editable-text-editor
        :not(:is(${collapsedElementSelectors}), :is(${hiddenElementSelectors}))
        + [style*="/*${error}*/"]:hover::before {
    color: var(--icon-button-hover-color);
    padding: 3px 4px;
    background-color: rgba(255, 0, 0, 0.375);
    backdrop-filter: blur(0.4rem);
    content: "⚠︎ Some items are hidden! Click to fix.";
}

/* Indent bullet points, lists, unhandled elements, etc. */
${indentStyles}

/* Must unindent the children of those box elems (asides). May have to change :not(li) to aside */
.note-detail-editable-text-editor :not(li, .ck-content) > [style*="margin-left:"] {
    margin-left: 0px !important;
}

/* Ensure that all hidden elements are completely hidden. */
.note-detail-editable-text-editor
        :is(${collapsedElementSelectors}, ${hiddenElementSelectors})
        + :is(${unhandledElementSelectors}),
.note-detail-editable-text-editor :is(${hiddenElementSelectors})
        {
    display: none !important;
}
`;

const styles = `
/* Collapsible Bullets CSS */

${doCollapsibleLists == 'true' ? collapsibleListsStyles : ''}

#right-pane .highlights-list li:has([style*="background-color:auto"]),
#right-pane .highlights-list li:has( > span:not([style])) {
    display: none;
}

/* Collapsible Sections CSS */

${doCollapsibleHeaders == 'true' ? collapsibleHeadersStyles : ''}
`;

// Add the styles to the UI here rather than via the widget, so it can work
// on mobile as well.
var styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);


function getIndentValue(element) {
    let indentValue = 0;

    // First, find the location of the margin-left property within the inline style.
    const style = $(element).attr('style');
    const marginIndex = style.indexOf('margin-left:'); // length of 12 characters
    if (marginIndex == -1) return indentValue;
    
    const trimmedStyle = style.slice(marginIndex + 12); // plus length of the margin string
    const pxIndex = trimmedStyle.indexOf('px');
    if (pxIndex == -1) return indentValue;
    
    const indentText = trimmedStyle.substring(0, pxIndex);
    if (isNaN(indentText)) return indentValue;
    
    indentValue = Number(indentText);
    
    return indentValue;
}

// Save the frontend state of the note, so our collapsible styles are persistent.
async function updateBackendData() {
    // Remove the filler <br> element from empty bullet points.
    // (without this, CKEditor automatically adds another <br> to all empty bullets
    // when calling setData() for some reason)
    const emptyBullets = $('.note-detail-editable-text-editor.ck-focused').find(`
        li br[data-cke-filler="true"]
    `);
    for (const emptyBullet of emptyBullets) {
        $(emptyBullet).remove();
    }

    // To prevent extra blank space from being added around horizontal lines.
    const hrLines = $('.note-detail-editable-text-editor.ck-focused').find(`
        div.ck-horizontal-line.ck-widget
    `);
    if ($(hrLines).length > 0) {
        $(hrLines).replaceWith('<hr>');
    }

    // Page breaks
    const pageBreaks = $('.note-detail-editable-text-editor.ck-focused').find(`
        div.page-break.ck-widget
    `);
    if ($(pageBreaks).length > 0) {
        $(pageBreaks).replaceWith('<br style="page-break-after: always;">');
    }
    
    // Update the backend data to what the frontend looks like
    let newData = $('.note-detail-editable-text-editor.ck-focused').html();
    const textEditor = await api.getActiveContextTextEditor();
    // This is an alternative to textEditor.setData() that makes persistent DOM
    // changes while preserving undo/redo history.
    textEditor.data.set(newData, { batchType: { isUndoable: true } });
}


$(document).off(".collapse-section");

if (doCollapsibleLists == 'true') {
// Collapse lists when bullet is clicked.
$(document).on("click.collapse-section", `
                    .note-detail-editable-text-editor
                        ul:not(.todo-list) > li:has( > :is(ul, ol)) > :first-child
                    `,
                    async e => {
    e.stopPropagation();
    // For some reason, the :first-child filter above is being applied to all descendants
    // in my testing, despite specifying only direct descendants with " > :first-child".
    // So we have to manually check that the clicked element's parent is a list item 🙄.
    const parentTag = $(e.target).parent().prop('tagName');
    const rect = e.target.getBoundingClientRect();
    if (parentTag == 'LI' && e.pageX < rect.left) {
        // Toggle the list collapsed marker for the element.
        const listCollapsedElements = $(e.target).find(`[style*="/*${listCollapsed}*/"]`);
        const spans = $(e.target).find(`span`);
        if ($(e.target).html() == '<br data-cke-filler="true">') {
            // If bullet is empty, do nothing.
            return;
        } else if (listCollapsedElements.length == 0 && spans.length == 0) {
            // Add marked child span if child span doesn't exist
            const newStyle = toggleMarker(
                $(e.target).attr('style'), listCollapsed, 'background-color:auto;');
            $(e.target).attr('style', newStyle);
        } else if (listCollapsedElements.length == 0) {
            // If child span exists, toggle marker there
            for (const span of spans) {
                const newStyle = toggleMarker(
                    $(span).attr('style'), listCollapsed, 'background-color:auto;');
                $(span).attr('style', newStyle);
            }
        } else { // Remove the marker from all children
            for (const listCollapsedElement of listCollapsedElements) {
                const newStyle = removeMarker(
                    $(listCollapsedElement).attr('style'), listCollapsed);
                $(listCollapsedElement).attr('style', newStyle);
            }
        }

        updateBackendData();

        moveCursorToElement($(e.target)[0]);
    }
});
}

function toggleSectionVisibility(startElement, indentValue = 0, collapseSection = true) {
    // Show or hide a section based on the given minimum section indent level.
    // Divide it by 40 to find the array index to count from to get higher-indent css selectors
    const selectorIndex = indentValue / 40; // 40 should be the default indent size (in pixels).
    // We can only really support elements that preserve their indent level when created.
    // Others are done through css and designated skipping with our custom nextUntil()
    // simulation, but then they will always take the indent of the prior element.

    // These are elements we cannot handle (because they don't preserve margin-left / styles):
        // (horizontal line, include note, mermaid diagram,
        // code block, table, page break, img)
    // These are elements we can handle:
        // 1) (all other elements) - first element has indent
        // 2) (block quote, caution, important, note, tip, warning) - child has indent
        // 3) (lists) - grandchild has indent
    const group1ElementCss = standardSelectors.slice(selectorIndex).join(', ');
    const group2ElementCss = childSelectors.slice(selectorIndex).join(', ');
    let group3ElementCss = grandchildSelectors.slice(selectorIndex).join(', ');
    const unindentedListCss = `
        :is(ul, ol):has(li > p[style*="margin-left:0px"]), 
        :is(ul, ol):has(li > :not(p[style*="margin-left:"]))
    `;
    // TODO If lists are considered indented, add same level list selectors to group 3
    if (considerListsIndented == 'true') {
        if (selectorIndex == 0) {
            group3ElementCss = group3ElementCss + ', ' + unindentedListCss;
        } else {
            group3ElementCss = group3ElementCss + ', ' + grandchildSelectors[selectorIndex - 1];
        }
    }
    // Go until the element is not selectable by one in our lists
    // Elements are separated by which one stores the indent info (group 1, 2, or 3)
    let targetElements = [];
    let currentElement = startElement;
    let isIteratingSubsection = false;
    let subsectionIndentCss = '';
    while (currentElement.length > 0) {
        const isCurrentGroup1 = $(currentElement).is(group1ElementCss);
        const isCurrentGroup2 = $(currentElement).is(group2ElementCss);
        const isCurrentGroup3 = $(currentElement).is(group3ElementCss);
        
        // If we're collapsing, ignore already :hidden elements that belong
        // to group 1, 2, or 3 css. Any non-hidden elements of a higher indent level than
        // the original header should be made hidden.
        if (collapseSection && $(currentElement).is(`:hidden`)) {
            if (isCurrentGroup1 || isCurrentGroup2 || isCurrentGroup3) {
                currentElement = $(currentElement).next();
                continue;
            }
        }

        // If we're iterating a subsection, ignore the element if it is a higher
        // indent level than the threshold we noted at the beginning of the subsection.
        // Make sure to set iteratingSubsection to false if it's a break element.
        if (isIteratingSubsection) {
            // if it's in the subsectionIndentCss styles, then skip it.
            if ($(currentElement).is(subsectionIndentCss)) {
                currentElement = $(currentElement).next();
                continue;
            }
            // else if it's an image, skip it.
            else if ($(currentElement).is('.image')) {
                currentElement = $(currentElement).next();
                continue;
            }
            // else if it's an unhandlable element,
            else if ($(currentElement).is(unhandledElementSelectors)) {
                // Stop iterating through subsection if there's 2 unhandlables in a row
                if ($($(currentElement).next()).is(unhandledElementSelectors)) {
                    isIteratingSubsection = false;
                } else { // if there's only one unhandlable in a row, skip it
                    currentElement = $(currentElement).next();
                    continue;
                }
            }
            else isIteratingSubsection = false;
        }
        
        // If the current element is a collapsed header and we're expanding, the
        // next loop iterations should ignore all subsequent elements of a
        // higher indent level than that element (or are unhandlable).
        if (
            !collapseSection && 
            $(currentElement).is(`[style*="/*${collapsed}*/"]`)
        ) {
            // We are now iterating through a subsection
            isIteratingSubsection = true;
            // Set the subsection indent level css, then proceed as usual to the next loop.
            // This header element should still be handled normally.
            const subsectionIndent = getIndentValue(currentElement);
            const subsectionCssIndex = subsectionIndent / 40;
            subsectionIndentCss = [
                standardSelectors.slice(subsectionCssIndex).join(', '),
                childSelectors.slice(subsectionCssIndex).join(', '),
                grandchildSelectors.slice(subsectionCssIndex).join(', ')
            ].join(', ');
        }
        
        if (considerListsIndented == 'true' && collapseSection) {
            const isCurrentUnindentedList = $(currentElement).is(unindentedListCss);
            const isCurrentP = $(currentElement).is('p');
            if (isCurrentUnindentedList && !isCurrentP) {
                // If it's an empty unindented list, break! Just consider that the section end.
                const firstLi = $(currentElement).children('li:first-child');
                const liSpan = $(firstLi).children('span:first-child');
                if ($(liSpan).html() == '<br data-cke-filler="true">') break;
            }
        }
        
        if (isCurrentGroup1) {
            targetElements.push($(currentElement));
        } else if (isCurrentGroup2) {
            // get its children and append them to the list
            const children = $(currentElement).children();
            targetElements = targetElements.concat(children);
        } else if (isCurrentGroup3) {
            if (collapseSection) {
                // get its children then get its grandchildren to append to the list
                const firstChild = $(currentElement).children('li:first-child');
                const firstGrandchild = $(firstChild).children(':first-child');
                const greatGrandchildren = $(firstGrandchild).children();
                if ($(firstGrandchild).is('span') && greatGrandchildren.length > 0) {
                    targetElements = targetElements.concat(greatGrandchildren);
                } else targetElements.push($(firstGrandchild));
            } else {
                // When we're expanding, target all descendants with hidden markers.
                const hiddenDescendants = $(currentElement).find(`[style*="/*${hidden}*/"]`);
                targetElements = targetElements.concat(hiddenDescendants);
            }
        } else if ($(currentElement).is(`.image`)) {
            targetElements.push($(currentElement));
        } else if ($(currentElement).is(unhandledElementSelectors)) {
            // Skip elements that we can't handle, and stop if there's more than one in a row
            if ($($(currentElement).next()).is(unhandledElementSelectors)) {
                break;
            }
        } else break;
        currentElement = $(currentElement).next();
    }

    // If the section is empty, do nothing.
    if (targetElements.length == 0) return;
    
    // Add or remove a 'hidden' marker for each section element.
    if (collapseSection) {
        // Insert the error element in case the section header gets deleted when collapsed.
        $(`<p style="margin-left:${indentValue + 40}px/*${hidden}*//*${error}*/;">
            [Hidden Section]</p>`).insertBefore($(startElement));
        
        for (const targetElement of targetElements) {
            let elementType = 'text';
            if (targetElement.is('.image')) elementType = 'img';
            else if (targetElement.is('span')) elementType = 'span';
            
            const newStyle = addMarker(
                $(targetElement).attr('style'), hidden, elementType
            );
            $(targetElement).attr('style', newStyle);
        }
    } else {
        for (const targetElement of targetElements) {
            let elementType = 'text';
            if (targetElement.is('.image')) elementType = 'img';
            else if (targetElement.is('span')) elementType = 'span';
            
            const newStyle = removeMarker(
                $(targetElement).attr('style'), hidden, elementType
            );
            $(targetElement).attr('style', newStyle);
        }
        
        // Remove the error element now that the section is visible again.
        if ($(startElement).is(`[style*="/*${error}*/"]`)) $(startElement).remove();
    }
}

async function moveCursorToElement(selectTarget) {
    // See CKEditor 5 docs for info on these functions. (you will get a headache)
    const editor = await api.getActiveContextTextEditor();
    editor.editing.view.focus();
    const model = editor.model;
    const selectTargetPosition = editor.editing.view.domConverter.domPositionToView(selectTarget);
    const viewPosition = editor.editing.view.createPositionAt(selectTargetPosition, 'end');
    const modelPosition = editor.editing.mapper.toModelPosition(viewPosition);
    const range = model.createRange(modelPosition);
    model.change( writer => {
        writer.setSelection(range);
    });
}

if (doCollapsibleHeaders == 'true') {
let collapsibleHeadingSelector = `
    .note-detail-editable-text-editor [style*="/*${collapsible}*/"]:not(ul *),
    .note-detail-editable-text-editor [style*="/*${collapsed}*/"]:not(ul *)
`;
if (allHeadersCollapsible == 'true') {
    collapsibleHeadingSelector = `
        .note-detail-editable-text-editor h2:not(ul *),
        .note-detail-editable-text-editor h3:not(ul *),
        .note-detail-editable-text-editor h4:not(ul *),
        .note-detail-editable-text-editor h5:not(ul *),
        .note-detail-editable-text-editor h6:not(ul *)
    `;
}
// Only collapse sections that are collapsible and not part of a list.
$(document).on("click.collapse-section", collapsibleHeadingSelector,
                    async e => {
    e.stopPropagation();
    const rect = e.target.getBoundingClientRect();
    let isClickOverToggle = false;
    if (minimalCollapsedHeaders == 'true')
        isClickOverToggle = e.pageX < rect.left;
    else
        isClickOverToggle = e.pageX < rect.left + 8;
    
    if (isClickOverToggle) {
        // Toggle the collapsed marker for the element.
        const newStyle = toggleMarker($(e.target).attr('style'), collapsed);
        $(e.target).attr('style', newStyle);
        let isSectionCollapsed = newStyle.includes(`/*${collapsed}*/`);
        // Get the margin-left value of the e.target element
        const indentValue = getIndentValue(e.target);
        let currentElement = $(e.target).next();
        toggleSectionVisibility(currentElement, indentValue, isSectionCollapsed);
        
        updateBackendData();

        moveCursorToElement($(e.target)[0]);
    }
});

// To fix leftover hidden elements if a collapsed section header is deleted.
// 
// If I'm clicking on a hidden one, that must mean it is somehow shown, meaning it was already
// filtered and found by our css selectors above that use :is() to reveal error elements.
// So we only need to check if the clicked element is one matching a hidden pattern, since
// we can't click actually hidden elements.
$(document).on("click.collapse-section", `
                    .note-detail-editable-text-editor [style*="/*${hidden}*/"],
                    .note-detail-editable-text-editor :has( > [style*="/*${hidden}*/"]),
                    .note-detail-editable-text-editor ul:has(p[style*="/*${hidden}*/"]),
                    .note-detail-editable-text-editor ol:has(p[style*="/*${hidden}*/"])
                    `,
                    async e => {
    e.stopPropagation();
    // Get all the elements with the hidden tag that are not hidden.
    const errorElements = $(`
        .note-detail-editable-text-editor.ck-focused
            [style*="/*${hidden}*/"]:not(:hidden)
    `);
    for (const errorElement of errorElements) {
        // Get the margin-left value of the e.target element
        const indentValue = getIndentValue(errorElement) - 40;
        // Make the section visible
        toggleSectionVisibility([errorElement], indentValue, false);
    }
    
    updateBackendData();
});
}

function getBaseDomNodeFromPosition(position, editor) {
    const viewPosition = editor.editing.mapper.toViewPosition(position);
    let viewNode = viewPosition.parent;
    // Ensure we're retrieving the base element (not text)
    while (viewNode.name == null || viewNode.name == 'span') {
        viewNode = viewNode.parent;
    }
    const domNode = editor.editing.view.domConverter.viewToDom(viewNode);
    return $(domNode);
}

async function getSelectedDomElement(lastPosition = false) {
    const editor = await api.getActiveContextTextEditor();
    const selection = editor.model.document.selection;
    const position = lastPosition?
        selection.getLastPosition() :
        selection.getFirstPosition();
    const domNode = getBaseDomNodeFromPosition(position, editor);
    return domNode;
}

async function toggleCollapsibility() {
    // Locate the base DOM element the cursor is in. This is our target element.
    const targetElement = await getSelectedDomElement();
    
    const elementType =  targetElement.prop('tagName');
    
    // Don't toggle collapsibility if it's not a valid collapsible element type (header).
    if (!(['H2', 'H3', 'H4', 'H5', 'H6'].includes(elementType))) return;

    const oldStyle = targetElement.attr('style');
    const newStyle = toggleMarker(oldStyle, collapsible);
    targetElement.attr('style', newStyle);
    if (oldStyle.includes(`/*${collapsed}*/`)) {
        const indentValue = getIndentValue(targetElement);
        let currentElement = $(targetElement).next();
        toggleSectionVisibility(currentElement, indentValue, false);
    }
    
    // Set the note's backend data to the new data (that's being seen by the user)
    updateBackendData();
    // Regain focus and place the cursor at the end of the header.
    moveCursorToElement($(targetElement)[0]);
}

function toggleMarker(style, marker, defaultStyle = 'margin-left:0px;') {
    let newStyle = style;
    if (style == null) newStyle = defaultStyle;

    // if the marker is already in the inline style attribute, remove it. else add it
    
    if (newStyle.includes(`/*${marker}*/`)) {
        // Remove the marker
        newStyle = newStyle.replaceAll(`/*${marker}*/`, '');
        if (marker == collapsible) {
            // Remove the collapsed marker as well, if there is one.
            newStyle = newStyle.replaceAll(`/*${collapsed}*/`, '');
        }
    } else {
        // Add the marker
        newStyle = newStyle.slice(0, -1) + `/*${marker}*/` + newStyle.slice(-1);
    }
    
    return newStyle;
}

function addMarker(style, marker, elementType = 'text') {
    let newStyle = style;
    if (style == null) {
        if (elementType == 'text') newStyle = 'margin-left:0px;';
        else if (elementType == 'img') newStyle = 'height:auto;';
        else if (elementType == 'span') newStyle = 'background-color:auto;';
    }

    // Add the marker
    newStyle = newStyle.slice(0, -1) + `/*${marker}*/` + newStyle.slice(-1);
    
    return newStyle;
}

function removeMarker(style, marker, elementType = 'text') {
    let newStyle = style;
    if (style == null) {
        if (elementType == 'text') newStyle = 'margin-left:0px;';
        else if (elementType == 'img') newStyle = 'height:auto;';
        else if (elementType == 'span') newStyle = 'background-color:auto;';
    }

    // Remove the marker
    newStyle = newStyle.replaceAll(`/*${marker}*/`, '');
    
    return newStyle;
}


class CollapsibleSectionsWidget extends api.NoteContextAwareWidget {
    // Higher value means position towards the bottom/right
    get position() { return 50; } // This shouldn't impact us
    
    get parentWidget() { return 'note-detail-pane'; }
    
    doRender() {
        this.$widget = $('');
        this.initializedEditorIds = [];
        // return this.$widget;
    }

    editorIntervalId = null;

    async addCollapsibleButton(noteNtxId, attempt = 0) {
        const toolbarContainerString = usingOldLayout == 'true'?
            `.note-split[data-ntx-id="${noteNtxId}"] .ribbon-body-container` :
            `.classic-toolbar-widget .ck-toolbar`;
        const $toolbar = $(toolbarContainerString).find('.ck-toolbar__items');
        const noToolbarFound = $toolbar.length == 0;
        
        if (noToolbarFound && attempt < 10) { // Max Attempts = 10 (arbitrary)
            // 1000ms delay (1 second), then try adding the toolbar button again.
            setTimeout(this.addCollapsibleButton.bind(this), 1000, noteNtxId, attempt + 1);
        } else {
            $toolbar.find('.collapsible-section-button').remove();
            const $button = $(TPL);
            $button.insertBefore($toolbar.children().eq(toolbarButtonPosition));
            $button.on('click', toggleCollapsibility);
        }
    }

    // This helps prevent errors when people try to delete a collapsed heading.
    // It detects it and stops them, so there aren't orphaned hidden elements.
    // (elements that were collapsed as part of the section but cannot be shown now)
    async addKeyProtections() {
        clearInterval(this.editorIntervalId);
        this.editorIntervalId = setInterval(async () => {
            const editor = await api.getActiveContextTextEditor();
            if (!editor || this.initializedEditorIds.includes(editor.id)) {
                return;
            }
            clearInterval(this.editorIntervalId);

            this.initializedEditorIds.push(editor.id);
            editor.editing.view.document.on('enter', ( evt, data ) => {
                const selection = editor.model.document.selection;
                const lastPosition = selection.getLastPosition();
                const lastDomNode = getBaseDomNodeFromPosition(lastPosition, editor);
                if ( // If last selection position is at end of collapsed heading
                    lastDomNode.is(collapsedElementSelectors) &&
                    lastPosition.parent.maxOffset == lastPosition.path[1]
                ) {
                    const firstPosition = selection.getFirstPosition();
                    if (lastPosition.isEqual(firstPosition)) {
                        // If first selection position is at the same place as the last
                        data.preventDefault();
                        evt.stop();
                    } else { // Check if it would erase the collapsed heading
                        const firstDomNode = getBaseDomNodeFromPosition(firstPosition, editor);
                        // Ignore if selection is within the same element
                        if (lastDomNode.is(firstDomNode)) return;
                        data.preventDefault();
                        evt.stop();
                    }
                }
            }, { priority: 'high' });
            editor.editing.view.document.on('delete', ( evt, data ) => {
                const selection = editor.model.document.selection;
                const lastPosition = selection.getLastPosition();
                const lastDomNode = getBaseDomNodeFromPosition(lastPosition, editor);
                const maxOffset = lastPosition.parent.maxOffset;
                const isCollapsedHeading = lastDomNode.is(collapsedElementSelectors);
                if (!isCollapsedHeading) return;
                if (data.domEvent.inputType == 'deleteContentForward') {
                    // Delete
                    if (
                        // If last selection position is at end of collapsed heading
                        // (full or empty)
                        maxOffset == lastPosition.path[1]
                    ) {
                        const firstPosition = selection.getFirstPosition();
                        if (lastPosition.isEqual(firstPosition)) {
                            // If first selection position is at the same place as the first
                            data.preventDefault();
                            evt.stop();
                        } else {
                            const firstDomNode = getBaseDomNodeFromPosition(firstPosition, editor);
                            // Ignore if deletion is within the same element
                            if (lastDomNode.is(firstDomNode)) return;
                            data.preventDefault();
                            evt.stop();
                        }
                    }
                } else if (data.domEvent.inputType == 'deleteContentBackward') {
                    // Backspace
                    if ( // If last selection position is in an empty collapsed heading
                        maxOffset == 0
                    ) {
                        // TODO Could automatically expand the heading instead.
                        data.preventDefault();
                        evt.stop();
                    } else if (maxOffset == lastPosition.path[1]) {
                        const firstPosition = selection.getFirstPosition();
                        const firstDomNode = getBaseDomNodeFromPosition(firstPosition, editor);
                        // Ignore if deletion is within the same element
                        if (lastDomNode.is(firstDomNode)) return;
                        data.preventDefault();
                        evt.stop();
                    }
                }
            }, { priority: 'high' });
        }, 1000);
    }
    
    async refreshWithNote() {
        if (
            doCollapsibleHeaders == 'true' && 
            this.note.type === 'text'
        ) {
            if (addKeyProtections == 'true')
                this.addKeyProtections();
            if (allHeadersCollapsible != 'true')
                await this.addCollapsibleButton(this.noteContext.ntxId);
        }
    }
}

module.exports = new CollapsibleSectionsWidget();