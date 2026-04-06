import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Pagination from './Pagination';

describe('Pagination Component', () => {
    it('renders correctly with given pages', () => {
        render(<Pagination currentPage={1} totalPages={5} onPageChange={() => { }} />);

        expect(screen.getByText(/Showing page/)).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('calls onPageChange when a page number is clicked', () => {
        const handlePageChange = jest.fn();
        render(<Pagination currentPage={1} totalPages={5} onPageChange={handlePageChange} />);

        const page2Button = screen.getByRole('button', { name: '2' });
        fireEvent.click(page2Button);

        expect(handlePageChange).toHaveBeenCalledWith(2);
    });

    it('disables previous button on first page', () => {
        render(<Pagination currentPage={1} totalPages={5} onPageChange={() => { }} />);

        const prevButton = screen.getAllByRole('button', { name: /Previous/i })[0];
        expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
        render(<Pagination currentPage={5} totalPages={5} onPageChange={() => { }} />);

        const nextButton = screen.getAllByRole('button', { name: /Next/i })[0];
        expect(nextButton).toBeDisabled();
    });

    it('does not render if totalPages is 1', () => {
        const { container } = render(<Pagination currentPage={1} totalPages={1} onPageChange={() => { }} />);
        expect(container.firstChild).toBeNull();
    });
});
