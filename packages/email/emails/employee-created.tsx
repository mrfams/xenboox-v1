import { Text, Heading } from "@react-email/components";
import { EmailLayout, DataRow, Divider, InfoBox } from "./_layout";

type EmployeeCreatedProps = {
  employeeName: string;
  employeeNumber: string;
  department?: string;
  jobTitle?: string;
  hireDate: string;
  basicSalary: string;
  currency: string;
  entityName: string;
};

export function EmployeeCreatedEmail(props: EmployeeCreatedProps) {
  return (
    <EmailLayout
      preview={`New employee added: ${props.employeeName}`}
    >
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-2">
        New Employee Added 👋
      </Heading>

      <Text className="text-[15px] text-[#64748B] m-0 mb-6">
        {props.entityName}
      </Text>

      <InfoBox variant="success">
        <Text className="text-[14px] text-[#16A34A] m-0">
          {props.employeeName} has been added to your payroll system.
        </Text>
      </InfoBox>

      <div className="bg-[#F8FAFC] rounded-lg p-4 mb-4">
        <DataRow label="Name" value={props.employeeName} bold />
        <Divider />
        <DataRow label="Employee #" value={props.employeeNumber} />
        {props.department && (
          <>
            <Divider />
            <DataRow label="Department" value={props.department} />
          </>
        )}
        {props.jobTitle && (
          <>
            <Divider />
            <DataRow label="Title" value={props.jobTitle} />
          </>
        )}
        <Divider />
        <DataRow label="Hire Date" value={props.hireDate} />
        <Divider />
        <DataRow
          label="Salary"
          value={`${props.currency} ${props.basicSalary}`}
        />
      </div>
    </EmailLayout>
  );
}

EmployeeCreatedEmail.PreviewProps = {
  employeeName: "John Doe",
  employeeNumber: "EMP-001",
  department: "Engineering",
  jobTitle: "Senior Developer",
  hireDate: "August 1, 2026",
  basicSalary: "75,000.00",
  currency: "USD",
  entityName: "Acme Corp",
} satisfies EmployeeCreatedProps;
