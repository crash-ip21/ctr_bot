/**
 * Creates a pagination object
 * @param elements
 * @param currentPage
 * @param elementsPerPage
 * @returns {{pages: number, offset: number, elements: *, limit: number}}
 */
function createPagination(elements, currentPage, elementsPerPage) {
  const numElements = elements.length;
  const numPages = Math.ceil(numElements / elementsPerPage);

  if (currentPage <= 1) {
    currentPage = 1;
  }

  if (currentPage > numPages) {
    currentPage = numPages;
  }

  const offset = (currentPage - 1) * elementsPerPage;
  const limit = Number(offset) + Number(elementsPerPage);

  const slicedElements = elements.slice(offset, limit);

  return {
    numPages,
    offset,
    limit,
    elements: slicedElements,
    currentPage,
  };
}

module.exports = createPagination;
