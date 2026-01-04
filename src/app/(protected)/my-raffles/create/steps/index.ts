import { BasicInfoStep } from './basic-info-step';
import { TicketsStep } from './tickets-step';

export const STEPS = [
	{
		title: 'Lets add Basics',
		component: BasicInfoStep,
	},
	{
		title: 'Active time period & Tickets',
		component: TicketsStep,
	},
];
