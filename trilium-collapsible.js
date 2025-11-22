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
#label:doCollapsibleHeaders="promoted,alias=Collapsible Headers,single,boolean" #doCollapsibleHeaders=true 
#label:doCollapsibleLists="promoted,alias=Collapsible Lists,single,boolean" #doCollapsibleLists=true 
#label:indentImages="promoted,alias=Try to Indent Images,single,boolean" #indentImages=true 
#label:indentUnhandled="promoted,alias=Try to Indent Special Elements,single,boolean" #indentUnhandled=true 
#label:indentLevels="promoted,alias=Supported Indent Levels,single,number" #indentLevels=10 
#label:toolbarButtonPosition="promoted,alias=Toolbar Button Position,single,number" #toolbarButtonPosition=2
*/

const doCollapsibleHeaders = api.startNote.getLabelValue('doCollapsibleHeaders') ?? 'true';
const doCollapsibleLists = api.startNote.getLabelValue('doCollapsibleLists') ?? 'true';
const toolbarButtonPosition = api.startNote.getLabelValue('toolbarButtonPosition') ?? 2;
const indentLevels = api.startNote.getLabelValue('indentLevels') ?? 10;
const indentImages = api.startNote.getLabelValue('indentImages') ?? 'true';
const indentUnhandled = api.startNote.getLabelValue('indentUnhandled') ?? 'true';

// The cursor pattern allows us to find where the user is targeting in the note.
// (where the cursor is)
// WARNING: This should be a unique pattern that you will never type naturally!
// If it is a common pattern appearing elsewhere in your notes, the code will not work properly!
const cursor = '▼cursor▼';

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
    :is(ul, ol):has(li > p[style*="/*${hidden}*/"])
`;

const collapsibleElementSelectors = `
    h2[style*="/*${collapsible}*/"],
    h3[style*="/*${collapsible}*/"],
    h4[style*="/*${collapsible}*/"],
    h5[style*="/*${collapsible}*/"],
    h6[style*="/*${collapsible}*/"]
`;

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

const collapsibleListsStyles = `
/* Collapsible Bullets CSS */

.note-detail-editable-text-editor
        ul:not(.todo-list) > li:has( > :is(ul, ol)) > :first-child {
    margin-left: calc(-14px - 5px) !important;
    padding-left: calc(14px + 5px) !important;
}

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
        ul:not(.todo-list) > li:has( > :is(ul, ol)) > :first-child:hover::before {
    background-color: oklch(from var(--ck-color-base-background) calc(l + (0.8 - l) * 0.3) c h);
    cursor: pointer;
}

.note-detail-editable-text-editor
        ul:not(.todo-list)
            > li:has( > :is(ul, ol))
                > :first-child:has( > [style*="/*${listCollapsed}*/"])::before,
.note-detail-editable-text-editor
        ul:not(.todo-list)
            > li:has( > :is(ul, ol))
                > [style*="/*${listCollapsed}*/"]::before {
    background-color: oklch(from var(--ck-color-base-background) calc(l + (0.8 - l) * 0.3) c h);
    border-color: oklch(from var(--ck-color-base-background) calc(l + (0.8 - l) * 0.5) c h);
}

.note-detail-editable-text-editor :has( > [style*="/*${listCollapsed}*/"]) + :is(ul, ol),
.note-detail-editable-text-editor [style*="/*${listCollapsed}*/"] + :is(ul, ol) {
    display: none;
}
`;

const collapsibleHeadersStyles = `
/* Collapsible Sections CSS */

#collapsible-section-toggle::before {
    font-size: 16px;
}

/* This detects if the marker is present in the element's inline styles. */
.note-detail-editable-text-editor :is(${collapsibleElementSelectors}):not(ul *) {
    position: relative;
    padding-left: 12px;
}

.note-detail-editable-text-editor :is(${collapsibleElementSelectors}):not(ul *)::before {
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
}

.note-detail-editable-text-editor :is(${collapsibleElementSelectors}):not(ul *):hover::before {
    background-color: var(--icon-button-hover-background);
    color: var(--icon-button-hover-color);
}

.note-detail-editable-text-editor
        :is(${collapsibleElementSelectors})[style*="/*${collapsed}*/"]::before
        {
    transform: rotate(0);
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

#right-pane .highlights-list li:has([style*="background-color:auto"]) {
    display: none;
}

/* Collapsible Sections CSS */

${doCollapsibleHeaders == 'true' ? collapsibleHeadersStyles : ''}
`;


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
async function updateBackendData(removeCursor = false) {
    // Remove the filler <br> element from empty bullet points.
    // (without this, CKEditor automatically adds another <br> to all empty bullets
    // when calling setData() for some reason)
    const emptyBullets = $('.note-detail-editable-text-editor').find(`
        li br[data-cke-filler="true"]
    `);
    for (const emptyBullet of emptyBullets) {
        $(emptyBullet).remove();
    }
    
    // Update the backend data to what the frontend looks like
    let newData = $('.note-detail-editable-text-editor').html();
    if (removeCursor) newData = newData.replace(cursor, '');
    const textEditor = await api.getActiveContextTextEditor();
    // Unfortunately, setData() resets undo/redo history, but this is the only way
    // I've found to make DOM changes persistent between viewings.
    textEditor.setData(newData);
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
    if (parentTag == 'LI' && e.pageX < rect.left + 14.4 && e.pageY > rect.top + 7) {
        // Toggle the list collapsed marker for the element.
        const listCollapsedElements = $(e.target).find(`[style*="/*${listCollapsed}*/"]`);
        const spans = $(e.target).find(`span`);
        if ($(e.target).html() == '<br data-cke-filler="true">') {
            // If bullet is empty, do nothing.
            return;
        } else if (listCollapsedElements.length == 0 && spans.length == 0) {
            // Add marked child if child doesn't exist
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
    }
});
}

if (doCollapsibleHeaders == 'true') {
// Only collapse sections that are collapsible and not part of a list.
$(document).on("click.collapse-section", `
                    .note-detail-editable-text-editor [style*="/*${collapsible}*/"]:not(ul *)
                    `,
                    async e => {
    e.stopPropagation();
    const rect = e.target.getBoundingClientRect();
    if (e.pageX < rect.left + 8) {
        // Toggle the collapsed marker for the element.
        const newStyle = toggleMarker($(e.target).attr('style'), collapsed);
        $(e.target).attr('style', newStyle);
        let isSectionCollapsed = newStyle.includes(`/*${collapsed}*/`);
        // Get the margin-left value of the e.target element
        const indentValue = getIndentValue(e.target);
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
        const group3ElementCss = grandchildSelectors.slice(selectorIndex).join(', ');
        // Go until the element is not selectable by one in our lists
        // Elements are separated by which one stores the indent info (group 1, 2, or 3)
        let targetElements = [];
        let currentElement = $(e.target).next();
        let isIteratingSubsection = false;
        let subsectionIndentCss = '';
        while (true) {
            const isCurrentGroup1 = $(currentElement).is(group1ElementCss);
            const isCurrentGroup2 = $(currentElement).is(group2ElementCss);
            const isCurrentGroup3 = $(currentElement).is(group3ElementCss);
            
            // If we're collapsing, ignore already :hidden elements that belong
            // to group 1, 2, or 3 css. Any non-hidden elements of a higher indent level than
            // the original header should be made hidden.
            if (isSectionCollapsed && $(currentElement).is(`:hidden`)) {
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
                !isSectionCollapsed && 
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
                    standardSelectors.slice(subsectionCssIndex).join(', '),
                    standardSelectors.slice(subsectionCssIndex).join(', ')
                ].join(', ');
            }
            
            if (isCurrentGroup1) {
                targetElements.push($(currentElement));
            } else if (isCurrentGroup2) {
                // get its children and append them to the list
                const children = $(currentElement).children();
                targetElements = targetElements.concat(children);
            } else if (isCurrentGroup3) {
                // get its children then get its grandchildren to append to the list
                const children = $(currentElement).children();
                for (const child of children) {
                    const grandchildren = $(child).children();
                    targetElements = targetElements.concat(grandchildren);
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
        
        // Add or remove a 'hidden' marker for each section element.
        if (isSectionCollapsed) {
            // Insert the error element in case the section header gets deleted when collapsed.
            $(`<p style="margin-left:${indentValue + 40}px/*${hidden}*//*${error}*/;">
                [Hidden Section]</p>`).insertAfter($(e.target));
            
            for (const targetElement of targetElements) {
                if (targetElement.is('.image')) {
                    const newStyle = addMarker(
                        $(targetElement).attr('style'), hidden, 'img'
                    );
                    $(targetElement).attr('style', newStyle);
                } else {
                    const newStyle = addMarker($(targetElement).attr('style'), hidden);
                    $(targetElement).attr('style', newStyle);
                }
            }
        } else {
            for (const targetElement of targetElements) {
                if (targetElement.is('.image')) {
                    const newStyle = removeMarker(
                        $(targetElement).attr('style'), hidden, 'img'
                    );
                    $(targetElement).attr('style', newStyle);
                } else {
                    const newStyle = removeMarker($(targetElement).attr('style'), hidden);
                    $(targetElement).attr('style', newStyle);
                }
            }
            
            // Remove the error element now that the section is visible again.
            const errorElement = $(e.target).next();
            if ($(errorElement).is(`[style*="/*${error}*/"]`)) $(errorElement).remove();
        }
        
        updateBackendData();
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
                    .note-detail-editable-text-editor ul:has(li > p[style*="/*${hidden}*/"]),
                    .note-detail-editable-text-editor ol:has(li > p[style*="/*${hidden}*/"])
                    `,
                    async e => {
    e.stopPropagation();
    // Get all the elements with the hidden tag that are not hidden.
    const errorElements = $(`
        .note-detail-editable-text-editor
            [style*="/*${hidden}*/"]:not(:hidden)
        `);
    const group1ElementCss = standardSelectors.join(', ');
    const group2ElementCss = childSelectors.join(', ');
    const group3ElementCss = grandchildSelectors.join(', ');
    // For each of them, get all the hidden elements that follow it.
    // And remove thier 'hidden' marker
    let hiddenSectionElements = [];
    for (const errorElement of errorElements) {
        // Made a custom "next until not hidden" function, since the JQuery
        // nextUntil() kept retrieving the inline-styles wrong. This works fine.
        let currentElement = errorElement;
        let isIteratingSubsection = false;
        let subsectionIndentCss = '';
        do {
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
            
            if ($(currentElement).is(group1ElementCss)) {
                hiddenSectionElements.push($(currentElement));
            } else if ($(currentElement).is(group2ElementCss)) {
                // get its children and append them to the list
                const children = $(currentElement).children();
                hiddenSectionElements = hiddenSectionElements.concat(children);
            } else if ($(currentElement).is(group3ElementCss)) {
                // get its children then get its grandchildren to append to the list
                const children = $(currentElement).children();
                for (const child of children) {
                    const grandchildren = $(child).children();
                    hiddenSectionElements = hiddenSectionElements.concat(grandchildren);
                }
            } else if ($(currentElement).is(`.image`)) {
                const newStyle = removeMarker(
                    $(currentElement).attr('style'), hidden, 'img'
                );
                $(currentElement).attr('style', newStyle);
            }
            currentElement = $(currentElement).next();
        } while ($(currentElement).is(`:hidden`));
        if ($(errorElement).is(`[style*="/*${error}*/"]`)) $(errorElement).remove();
    }
    // For all of these elements, remove the 'hidden' marker
    for (const hiddenSectionElement of hiddenSectionElements) {
        const newStyle = removeMarker($(hiddenSectionElement).attr('style'), hidden);
        $(hiddenSectionElement).attr('style', newStyle);
    }
    
    updateBackendData();
});
}

async function toggleCollapsibility() {
    // Add text indicator at the cursor location so we can find the element to make collapsible.
    await api.addTextToActiveContextEditor(cursor);
    // Locate the first element with the cursor indicator. This will be our target element.
    const targetElement = $(`
        .note-detail-editable-text-editor :contains("${cursor}")
    `).first();
    
    const elementType = targetElement.prop('tagName');
    // Only toggle collapsibility if it's a valid collapsible element type (header).
    if (['H2', 'H3', 'H4', 'H5', 'H6'].includes(elementType)) {
        const newStyle = toggleMarker(targetElement.attr('style'), collapsible);
        targetElement.attr('style', newStyle);
        if (newStyle.includes(`/*${collapsible}*/`)) {
            $(targetElement).attr('contenteditable', false);
        } else {
            $(targetElement).attr('contenteditable', true);
        }
    }
    
    // Set the note's backend data to the new data (that's being seen by the user)
    // and remove the cursor indicator from the note.
    updateBackendData(true);
    // Regain focus, since we've clicked outside the editor to apply the style from the toolbar
    const textEditor = await api.getActiveContextTextEditor();
    textEditor.focus();
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
        this.$widget = $('<div></div>');
        this.cssBlock(styles);
        return this.$widget;
    }

    async addCollapsibleButton(noteNtxId, attempts = 0) {
        const $toolbar = $(`
            .note-split[data-ntx-id="${noteNtxId}"] 
            .ribbon-body-container
        `).find('.ck-toolbar__items');
        const noToolbarFound = $toolbar.length == 0;
        
        if (noToolbarFound && attempts < 10) { // Max Attempts = 10 (arbitrary)
            // 1000ms delay (1 second), then try adding the toolbar button again.
            setTimeout(this.addCollapsibleButton.bind(this), 1000, noteNtxId, attempts + 1);
        } else {
            $toolbar.find('.collapsible-section-button').remove();
            const $button = $(TPL);
            $button.insertBefore($toolbar.children().eq(toolbarButtonPosition));
            $button.on('click', toggleCollapsibility);
        }
    }
    
    async refreshWithNote() {
        if (doCollapsibleHeaders == 'true' && this.note.type === 'text') {
            await this.addCollapsibleButton(this.noteContext.ntxId);
        }
    }
}

module.exports = new CollapsibleSectionsWidget();