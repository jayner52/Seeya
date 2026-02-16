/**
 * Open the browser print dialog for the current page.
 * The page uses print-friendly CSS (via @media print) to hide
 * navigation chrome and format the itinerary for paper output.
 */
export function printTripItinerary(): void {
  window.print();
}
