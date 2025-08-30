export interface VisibleRange {
    startIndex: number;
    endIndex: number;
}

export function calculateVisibleRange(
    itemHeights: number[],
    panelHeight: number,
    scrollOffset: number,
): VisibleRange {
    const startIndex = scrollOffset;
    let endIndex = startIndex - 1;
    let usedHeight = 0;

    for (let i = startIndex; i < itemHeights.length; i++) {
        const itemHeight = itemHeights[i];
        if (usedHeight + itemHeight > panelHeight) {
            break;
        }
        usedHeight += itemHeight;
        endIndex = i;
    }

    return { startIndex, endIndex };
}

export interface ScrollbarInfo {
    y: number;
    height: number;
    shouldShow: boolean;
}

export function calculateScrollbar(
    totalItems: number,
    visibleItems: number,
    scrollOffset: number,
    panelHeight: number,
): ScrollbarInfo {
    if (totalItems <= visibleItems) {
        return { y: 0, height: 0, shouldShow: false };
    }

    const scrollbarHeight = Math.max(
        1,
        Math.floor((panelHeight * visibleItems) / totalItems),
    );
    const maxScroll = totalItems - visibleItems;
    const scrollRatio = maxScroll > 0 ? scrollOffset / maxScroll : 0;
    const scrollbarY = Math.floor(
        (panelHeight - scrollbarHeight) * scrollRatio,
    );

    return { y: scrollbarY, height: scrollbarHeight, shouldShow: true };
}

export function ensureVisible(
    selectedIndex: number,
    currentScrollOffset: number,
    maxVisible: number,
    totalItems: number,
): number {
    let newScrollOffset = currentScrollOffset;

    if (selectedIndex < newScrollOffset) {
        newScrollOffset = selectedIndex;
    } else if (selectedIndex >= newScrollOffset + maxVisible) {
        newScrollOffset = selectedIndex - maxVisible + 1;
    }

    const maxOffset = Math.max(0, totalItems - maxVisible);
    return Math.max(0, Math.min(newScrollOffset, maxOffset));
}

export function ensureVisibleVariable(
    selectedIndex: number,
    currentScrollOffset: number,
    itemHeights: number[],
    panelHeight: number,
): number {
    const { startIndex, endIndex } = calculateVisibleRange(
        itemHeights,
        panelHeight,
        currentScrollOffset,
    );

    if (selectedIndex >= startIndex && selectedIndex <= endIndex) {
        return currentScrollOffset;
    }

    if (selectedIndex < startIndex) {
        return selectedIndex;
    }

    let newScrollOffset = currentScrollOffset;
    let usedHeight = 0;
    for (let i = selectedIndex; i >= 0; i--) {
        const itemHeight = itemHeights[i];
        if (usedHeight + itemHeight > panelHeight) {
            break;
        }
        usedHeight += itemHeight;
        newScrollOffset = i;
    }
    return newScrollOffset;
}
