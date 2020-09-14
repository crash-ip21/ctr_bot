/**
 * Creates a pagination object
 * @param elements
 * @param page
 * @param elementsPerPage
 * @returns {{pages: number, offset: number, elements: *, limit: number}}
 */
function createPagination(elements, page, elementsPerPage) {
    const countElements = elements.length;
    const countPages = Math.ceil(countElements / elementsPerPage);
    
    if (page <= 1) {
        page = 1;
    }
    
    if (page > countPages) {
        page = countPages;
    }
    
    const offset = (page - 1) * elementsPerPage;
    const limit = Number(offset) + Number(elementsPerPage);
    
    const slicedElements = elements.slice(offset, limit);
    
    return {
        pages       : countPages,
        offset      : offset,
        limit       : limit,
        elements    : slicedElements
    }
}

module.exports = createPagination;